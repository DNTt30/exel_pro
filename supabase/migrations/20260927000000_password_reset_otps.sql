-- OTP recovery: admin -> Telegram; employees -> registered recovery email.
BEGIN;
-- Fresh databases may not have the legacy admin log table yet.
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id text, actor_name text,
  action text NOT NULL, target text, detail text, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.admin_logs TO service_role;
GRANT SELECT ON public.admin_logs TO authenticated;
DROP POLICY IF EXISTS password_recovery_admin_log_read ON public.admin_logs;
CREATE POLICY password_recovery_admin_log_read ON public.admin_logs FOR SELECT TO authenticated USING (public.is_admin());
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS recovery_email text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS password_deadline timestamptz;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_recovery_email_valid;
ALTER TABLE public.employees ADD CONSTRAINT employees_recovery_email_valid
  CHECK (recovery_email IS NULL OR (length(recovery_email)<=254 AND recovery_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

CREATE OR REPLACE FUNCTION public.guard_recovery_email() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.recovery_email IS NOT DISTINCT FROM OLD.recovery_email THEN RETURN NEW; END IF;
  IF NEW.recovery_email IS NULL AND TG_OP='INSERT' THEN RETURN NEW; END IF;
  IF current_user IN ('authenticated','anon') THEN
    IF NOT (public.is_admin() OR
      (public.has_role('AREA_MANAGER') AND EXISTS(SELECT 1 FROM unnest(string_to_array(NEW.dept,',')) d WHERE trim(d) IN (SELECT public.my_managed_stores()))) OR
      (public.has_role('STORE_MANAGER') AND EXISTS(SELECT 1 FROM unnest(string_to_array(NEW.dept,',')) d WHERE trim(d) IN (SELECT public.my_managed_stores()))
        AND NOT (upper(coalesce(NEW.role,'')) = ANY(ARRAY['ADMIN','OFC','AM','AREA_MANAGER','SM','STORE_MANAGER'])
          OR upper(coalesce(NEW.type,'')) = ANY(ARRAY['ADMIN','OFC','AM','AREA_MANAGER','SM','STORE_MANAGER'])
          OR upper(coalesce(NEW.job_title,'')) = ANY(ARRAY['ADMIN','OFC','AM','AREA_MANAGER','SM','STORE_MANAGER'])
          OR concat_ws(' ',NEW.role,NEW.job_title) ILIKE ANY(ARRAY['%quản lý%','%cửa hàng trưởng%','%khu vực%'])))) THEN
      RAISE EXCEPTION 'RECOVERY_EMAIL_REQUIRES_MANAGER';
    END IF;
  END IF;
  NEW.recovery_email := nullif(lower(trim(NEW.recovery_email)),'');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS employee_recovery_email_guard ON public.employees;
CREATE TRIGGER employee_recovery_email_guard BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.guard_recovery_email();

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id text NOT NULL UNIQUE,
  otp_code text NOT NULL CHECK (otp_code ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  attempts int NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivery_address text
);
-- Separate history preserves the limit after OTP deletion; no OTP/password stored here.
CREATE TABLE IF NOT EXISTS public.password_reset_otp_requests (
  id uuid PRIMARY KEY, emp_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), claimed_at timestamptz,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','completed','failed'))
);
CREATE INDEX IF NOT EXISTS password_reset_requests_employee_time ON public.password_reset_otp_requests(emp_id,created_at DESC);
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_otp_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_reset_otps,public.password_reset_otp_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.password_reset_otps,public.password_reset_otp_requests TO service_role;

CREATE OR REPLACE FUNCTION public.issue_password_reset_otp(p_emp_id text,p_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid:=gen_random_uuid(); v_name text; v_email text; v_active boolean; v_count int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('password-reset:'||p_emp_id,0));
  IF p_emp_id='admin' THEN v_name:='Quản trị viên';
  ELSE
    SELECT name,is_active,recovery_email INTO v_name,v_active,v_email FROM employees WHERE id=p_emp_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('code','EMPLOYEE_NOT_FOUND'); END IF;
    IF NOT v_active THEN RETURN jsonb_build_object('code','EMPLOYEE_INACTIVE'); END IF;
    IF nullif(v_email,'') IS NULL THEN RETURN jsonb_build_object('code','RECOVERY_EMAIL_MISSING'); END IF;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE email=p_emp_id||'@ofc.app') THEN RETURN jsonb_build_object('code','AUTH_ACCOUNT_MISSING'); END IF;
  IF EXISTS(SELECT 1 FROM password_reset_otp_requests WHERE emp_id=p_emp_id AND status='processing'
    AND claimed_at>now()-interval '5 minutes') THEN RETURN jsonb_build_object('code','RESET_IN_PROGRESS'); END IF;
  SELECT count(*) INTO v_count FROM password_reset_otp_requests WHERE emp_id=p_emp_id AND created_at>now()-interval '15 minutes';
  IF v_count>=3 THEN RETURN jsonb_build_object('code','RATE_LIMITED'); END IF;
  DELETE FROM password_reset_otp_requests WHERE created_at<now()-interval '1 day';
  DELETE FROM password_reset_otps WHERE emp_id=p_emp_id;
  INSERT INTO password_reset_otp_requests(id,emp_id) VALUES(v_id,p_emp_id);
  INSERT INTO password_reset_otps(id,emp_id,otp_code,delivery_address) VALUES(v_id,p_emp_id,p_hash,v_email);
  RETURN jsonb_build_object('code','OK','id',v_id,'name',v_name,'email',v_email);
END $$;

CREATE OR REPLACE FUNCTION public.claim_password_reset_otp(p_emp_id text,p_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_otp password_reset_otps%ROWTYPE; v_uid uuid; v_status text; v_email text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('password-reset:'||p_emp_id,0));
  IF p_emp_id<>'admin' THEN
    SELECT recovery_email INTO v_email FROM employees WHERE id=p_emp_id AND is_active;
    IF NOT FOUND THEN RETURN jsonb_build_object('code','EMPLOYEE_INACTIVE'); END IF;
  END IF;
  SELECT * INTO v_otp FROM password_reset_otps WHERE emp_id=p_emp_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('code','OTP_INVALID'); END IF;
  SELECT status INTO v_status FROM password_reset_otp_requests WHERE id=v_otp.id;
  IF v_status IS DISTINCT FROM 'requested' THEN RETURN jsonb_build_object('code','OTP_USED'); END IF;
  IF v_otp.expires_at<=now() THEN RETURN jsonb_build_object('code','OTP_EXPIRED'); END IF;
  IF v_otp.delivery_address IS DISTINCT FROM v_email THEN RETURN jsonb_build_object('code','OTP_EXPIRED'); END IF;
  IF v_otp.attempts>=5 THEN RETURN jsonb_build_object('code','OTP_LOCKED'); END IF;
  IF v_otp.otp_code IS DISTINCT FROM p_hash THEN
    UPDATE password_reset_otps SET attempts=attempts+1 WHERE id=v_otp.id;
    RETURN jsonb_build_object('code',CASE WHEN v_otp.attempts=4 THEN 'OTP_LOCKED' ELSE 'OTP_INVALID' END);
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE email=p_emp_id||'@ofc.app';
  IF v_uid IS NULL THEN RETURN jsonb_build_object('code','AUTH_ACCOUNT_MISSING'); END IF;
  UPDATE password_reset_otp_requests SET status='processing',claimed_at=now() WHERE id=v_otp.id;
  RETURN jsonb_build_object('code','OK','id',v_otp.id,'user_id',v_uid);
END $$;

CREATE OR REPLACE FUNCTION public.finish_password_reset_otp(p_id uuid,p_success boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_request password_reset_otp_requests%ROWTYPE; v_emp_id text;
BEGIN
  SELECT emp_id INTO v_emp_id FROM password_reset_otp_requests WHERE id=p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('code','OTP_USED'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('password-reset:'||v_emp_id,0));
  SELECT * INTO v_request FROM password_reset_otp_requests WHERE id=p_id FOR UPDATE;
  IF v_request.status='completed' AND p_success THEN RETURN jsonb_build_object('code','OK'); END IF;
  IF p_success AND v_request.status<>'processing' THEN RETURN jsonb_build_object('code','OTP_USED'); END IF;
  IF p_success THEN
    UPDATE employees SET password_changed_at=now() WHERE id=v_request.emp_id;
    UPDATE app_profiles SET credential_set_at=now() WHERE emp_id=v_request.emp_id;
    INSERT INTO admin_logs(actor_id,actor_name,action,target,detail) VALUES(v_request.emp_id,v_request.emp_id,'PASSWORD_RESET_OTP',v_request.emp_id,
      'Tài khoản '||v_request.emp_id||' tự đặt lại mật khẩu bằng OTP.');
  END IF;
  DELETE FROM password_reset_otps WHERE id=p_id;
  UPDATE password_reset_otp_requests SET status=CASE WHEN p_success THEN 'completed' ELSE 'failed' END WHERE id=p_id;
  RETURN jsonb_build_object('code','OK');
END $$;
REVOKE ALL ON FUNCTION public.issue_password_reset_otp(text,text),public.claim_password_reset_otp(text,text),
  public.finish_password_reset_otp(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_password_reset_otp(text,text),public.claim_password_reset_otp(text,text),
  public.finish_password_reset_otp(uuid,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
