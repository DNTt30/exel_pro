BEGIN;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS major text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_plan_until text;

-- Even managers must use password confirmation when editing their OWN email.
CREATE OR REPLACE FUNCTION public.guard_self_recovery_email() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NEW.id=public.current_emp_id()
    AND NEW.recovery_email IS DISTINCT FROM OLD.recovery_email THEN
    RAISE EXCEPTION 'CURRENT_PASSWORD_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profile_self_email_guard ON public.employees;
CREATE TRIGGER profile_self_email_guard BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.guard_self_recovery_email();

-- The staff directory is shared for scheduling. Personal fields are RPC-only.
REVOKE SELECT ON public.employees FROM PUBLIC,anon,authenticated;
DO $$ DECLARE cols text; BEGIN
  SELECT string_agg(quote_ident(attname),',') INTO cols FROM pg_attribute
  WHERE attrelid='public.employees'::regclass AND attnum>0 AND NOT attisdropped
    AND attname NOT IN ('dob','university','major','work_plan_until');
  EXECUTE 'GRANT SELECT ('||cols||') ON public.employees TO authenticated';
END $$;
REVOKE SELECT(dob,university,major,work_plan_until) ON public.employees FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_employee_profiles(p_emp_id text DEFAULT NULL)
RETURNS TABLE(id text,name text,dept text,role text,type text,job_title text,
  recovery_email text,dob date,university text,major text,work_plan_until text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT e.id::text,e.name::text,e.dept::text,e.role::text,e.type::text,e.job_title,
    e.recovery_email,e.dob,e.university,e.major,e.work_plan_until FROM public.employees e
  WHERE public.current_emp_id() IS NOT NULL AND (p_emp_id IS NULL OR e.id=p_emp_id)
    AND (public.manages_employee(e.id) OR (p_emp_id IS NOT NULL AND e.id=public.current_emp_id()));
$$;
CREATE OR REPLACE FUNCTION public.update_my_employee_profile(p_dob date,p_university text,p_major text,p_work_plan_until text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE employee_id text:=public.current_emp_id();
BEGIN
  IF employee_id IS NULL OR employee_id='admin' THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  IF p_dob>current_date OR p_dob<date '1900-01-01' THEN RAISE EXCEPTION 'INVALID_DOB'; END IF;
  IF length(p_university)>160 OR length(p_major)>160 OR length(p_work_plan_until)>160 THEN
    RAISE EXCEPTION 'PROFILE_TEXT_TOO_LONG'; END IF;
  UPDATE public.employees SET dob=p_dob,university=nullif(trim(p_university),''),
    major=nullif(trim(p_major),''),work_plan_until=nullif(trim(p_work_plan_until),'')
  WHERE id=employee_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_employee_profiles(text),public.update_my_employee_profile(date,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_employee_profiles(text),public.update_my_employee_profile(date,text,text,text) TO authenticated;

-- Password verification is performed by the JWT-protected Edge Function only.
CREATE TABLE IF NOT EXISTS public.profile_email_change_attempts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_email_attempt_user_time ON public.profile_email_change_attempts(user_id,created_at);
ALTER TABLE public.profile_email_change_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_email_change_attempts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.profile_email_change_attempts TO service_role;
CREATE OR REPLACE FUNCTION public.begin_profile_email_change(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE employee_row public.employees%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('profile-email:'||p_user_id::text,0));
  SELECT e.* INTO employee_row FROM public.employees e JOIN auth.users u ON u.email=e.id||'@ofc.app'
    WHERE u.id=p_user_id AND e.is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('code','PROFILE_NOT_FOUND'); END IF;
  IF (SELECT count(*) FROM public.profile_email_change_attempts
    WHERE user_id=p_user_id AND created_at>now()-interval '15 minutes')>=5 THEN
    RETURN jsonb_build_object('code','RATE_LIMITED'); END IF;
  DELETE FROM public.profile_email_change_attempts WHERE user_id=p_user_id AND created_at<now()-interval '1 day';
  INSERT INTO public.profile_email_change_attempts(user_id) VALUES(p_user_id);
  RETURN jsonb_build_object('code','OK','emp_id',employee_row.id,'recovery_email',employee_row.recovery_email);
END;
$$;
CREATE OR REPLACE FUNCTION public.set_verified_recovery_email(p_user_id uuid,p_expected_email text,p_new_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE employee_id text; previous_email text; next_email text:=lower(trim(p_new_email));
BEGIN
  SELECT e.id INTO employee_id FROM public.employees e JOIN auth.users u ON u.email=e.id||'@ofc.app'
    WHERE u.id=p_user_id AND e.is_active;
  IF employee_id IS NULL THEN RETURN jsonb_build_object('code','PROFILE_NOT_FOUND'); END IF;
  IF next_email IS NULL OR length(next_email)>254 OR next_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RETURN jsonb_build_object('code','INVALID_EMAIL'); END IF;
  -- Same lock as OTP issue/claim/finish; an in-flight Auth reset must finish first.
  PERFORM pg_advisory_xact_lock(hashtextextended('password-reset:'||employee_id,0));
  SELECT recovery_email INTO previous_email FROM public.employees WHERE id=employee_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('code','PROFILE_NOT_FOUND'); END IF;
  IF previous_email IS DISTINCT FROM p_expected_email THEN RETURN jsonb_build_object('code','EMAIL_CHANGED'); END IF;
  IF EXISTS(SELECT 1 FROM public.password_reset_otp_requests WHERE emp_id=employee_id
    AND status='processing' AND claimed_at>now()-interval '5 minutes') THEN
    RETURN jsonb_build_object('code','RESET_IN_PROGRESS'); END IF;
  UPDATE public.employees SET recovery_email=next_email WHERE id=employee_id;
  DELETE FROM public.password_reset_otps WHERE emp_id=employee_id;
  UPDATE public.password_reset_otp_requests SET status='failed' WHERE emp_id=employee_id AND status='requested';
  INSERT INTO public.admin_logs(actor_id,action,target,detail)
    VALUES(employee_id,'UPDATE_RECOVERY_EMAIL',employee_id,'Nhân viên đổi email khôi phục sau khi xác nhận mật khẩu.');
  RETURN jsonb_build_object('code','OK');
END;
$$;
REVOKE ALL ON FUNCTION public.begin_profile_email_change(uuid),public.set_verified_recovery_email(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_profile_email_change(uuid),public.set_verified_recovery_email(uuid,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
