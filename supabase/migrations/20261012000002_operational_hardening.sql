-- Requires database catchup / stability transactions. One database per organization.
BEGIN;
CREATE TABLE IF NOT EXISTS public.role_permission_keys (
  role_group text NOT NULL CHECK (role_group IN ('staff','sm','am','admin')),
  permission_key text NOT NULL,
  PRIMARY KEY(role_group,permission_key)
);
INSERT INTO public.role_permission_keys VALUES
 ('staff','schedule.register'),('staff','payroll.view_self'),
 ('sm','schedule.write'),('sm','schedule.submit'),('sm','attendance.write'),('sm','attendance.approve'),('sm','payroll.view_store'),
 ('am','schedule.write'),('am','schedule.submit'),('am','schedule.review'),('am','attendance.write'),('am','attendance.approve'),('am','payroll.view_store'),
 ('admin','schedule.write'),('admin','schedule.submit'),('admin','schedule.review'),('admin','schedule.override'),
 ('admin','attendance.write'),('admin','attendance.approve'),('admin','payroll.view_store'),('admin','roles.manage')
ON CONFLICT DO NOTHING;
ALTER TABLE public.role_permission_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.role_permission_keys FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.role_permission_keys TO authenticated;
DROP POLICY IF EXISTS permission_keys_read ON public.role_permission_keys;
CREATE POLICY permission_keys_read ON public.role_permission_keys FOR SELECT TO authenticated USING (public.current_emp_id() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.has_permission(p_key text,p_store text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.current_emp_id() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.role_permission_keys k WHERE k.permission_key=p_key AND k.role_group =
   CASE WHEN public.is_admin() THEN 'admin' WHEN public.has_role('AREA_MANAGER') THEN 'am'
    WHEN public.has_role('STORE_MANAGER') THEN 'sm' ELSE 'staff' END
 ) AND (p_store IS NULL OR public.can_manage_store(p_store));
$$;
REVOKE ALL ON FUNCTION public.has_permission(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text,text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.server_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id text NOT NULL,
 action text NOT NULL, resource_type text NOT NULL, resource_id text NOT NULL,
 store_id text, old_data jsonb, new_data jsonb, metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS server_audit_recent ON public.server_audit_events(created_at DESC);
ALTER TABLE public.server_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.server_audit_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.server_audit_events TO authenticated;
DROP POLICY IF EXISTS server_audit_admin_read ON public.server_audit_events;
CREATE POLICY server_audit_admin_read ON public.server_audit_events FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.audit_operational_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE before_row jsonb; after_row jsonb; row_data jsonb; actor text; store_key text; entity text;
BEGIN
 actor:=public.current_emp_id();
 IF actor IS NULL THEN actor:='service'; END IF;
 IF TG_OP<>'INSERT' THEN before_row:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN after_row:=to_jsonb(NEW); END IF;
 IF before_row IS NOT DISTINCT FROM after_row THEN RETURN NULL; END IF;
 row_data:=coalesce(after_row,before_row);
 store_key:=coalesce(row_data->>'store_id',row_data->>'dept',row_data->>'store');
 IF store_key IS NULL THEN SELECT dept INTO store_key FROM employees WHERE id=row_data->>'emp_id'; END IF;
 entity:=coalesce(row_data->>'id',concat_ws(':',row_data->>'emp_id',row_data->>'week_date',row_data->>'work_date'));
 INSERT INTO server_audit_events(actor_id,action,resource_type,resource_id,store_id,old_data,new_data,metadata)
 VALUES(actor,TG_TABLE_NAME||'.'||lower(TG_OP),TG_TABLE_NAME,entity,store_key,before_row,after_row,
  jsonb_strip_nulls(jsonb_build_object('source','database','overrideReason',nullif(current_setting('app.schedule_override_reason',true),''))));
 RETURN NULL;
END;
$$;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['schedules','attendance','feedbacks','schedule_weeks','shift_swaps'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS operation_audit ON public.%I',tbl);
  EXECUTE format('CREATE TRIGGER operation_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_operational_write()',tbl);
 END LOOP;
END $$;

-- One parser for current objects and legacy strings. Unconfirmed availability is
-- syntax-checked but excluded from committed staff hours/rest constraints.
CREATE OR REPLACE FUNCTION public.schedule_segments(p_week text,p_shifts jsonb)
RETURNS TABLE(day_date date,start_at timestamp,end_at timestamp,work_hours numeric)
LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE cell record; code text; part text; flag text; confirmed boolean; start_h integer; end_h integer; offset_day integer;
BEGIN
 IF p_week !~ '^\d{4}-\d{2}-\d{2}$' OR extract(isodow FROM p_week::date)<>1 OR to_char(p_week::date,'YYYY-MM-DD')<>p_week THEN
  RAISE EXCEPTION 'INVALID_WEEK' USING ERRCODE='22023';
 END IF;
 IF jsonb_typeof(p_shifts) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'INVALID_SHIFTS' USING ERRCODE='22023'; END IF;
 FOR cell IN SELECT key,value FROM jsonb_each(p_shifts) LOOP
  offset_day:=array_position(ARRAY['T2','T3','T4','T5','T6','T7','CN'],cell.key)-1;
  IF offset_day IS NULL THEN RAISE EXCEPTION 'INVALID_DAY' USING ERRCODE='22023'; END IF;
  confirmed:=true;
  IF jsonb_typeof(cell.value)='object' THEN
   IF jsonb_typeof(cell.value->'shift') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'INVALID_SHIFT_CELL' USING ERRCODE='22023'; END IF;
   FOREACH flag IN ARRAY ARRAY['confirmed','isConfirmed','registered','isRegistered'] LOOP
    IF cell.value ? flag AND jsonb_typeof(cell.value->flag) IS DISTINCT FROM 'boolean' THEN
     RAISE EXCEPTION 'INVALID_SHIFT_CELL' USING ERRCODE='22023'; END IF;
   END LOOP;
   IF cell.value ? 'status' AND (jsonb_typeof(cell.value->'status') IS DISTINCT FROM 'string' OR cell.value->>'status' NOT IN ('registered','confirmed','draft')) THEN
    RAISE EXCEPTION 'INVALID_SHIFT_CELL' USING ERRCODE='22023'; END IF;
   IF cell.value ? 'covering_store' AND (jsonb_typeof(cell.value->'covering_store') NOT IN ('string','null') OR length(cell.value->>'covering_store')>50) THEN
    RAISE EXCEPTION 'INVALID_SHIFT_CELL' USING ERRCODE='22023'; END IF;
   code:=cell.value->>'shift';
   IF cell.value ? 'confirmed' THEN confirmed:=(cell.value->>'confirmed')::boolean;
   ELSIF cell.value ? 'isConfirmed' THEN confirmed:=(cell.value->>'isConfirmed')::boolean;
   ELSE confirmed:=NOT (coalesce((cell.value->>'registered')::boolean,false) OR coalesce((cell.value->>'isRegistered')::boolean,false) OR coalesce(cell.value->>'status'='registered',false)); END IF;
  ELSIF jsonb_typeof(cell.value)='string' THEN
   code:=split_part(cell.value#>>'{}','_',1);
   IF code ~ '(^\?|:reg$|:draft$)' THEN confirmed:=false; code:=regexp_replace(regexp_replace(code,'^\?',''),':(reg|draft)$',''); END IF;
  ELSE RAISE EXCEPTION 'INVALID_SHIFT_CELL' USING ERRCODE='22023'; END IF;
  code:=btrim(code);
  IF code IN ('','0') OR lower(code)='off' THEN CONTINUE; END IF;
  code:=CASE upper(code) WHEN '1' THEN '6-14' WHEN '2' THEN '14-22' WHEN '3' THEN '22-6' WHEN 'HC' THEN '8-17' ELSE code END;
  FOREACH part IN ARRAY string_to_array(code,'/') LOOP
   part:=btrim(part);
   IF part !~ '^\d{1,2}-\d{1,2}$' THEN RAISE EXCEPTION 'INVALID_SHIFT_CODE: %',part USING ERRCODE='22023'; END IF;
   start_h:=split_part(part,'-',1)::int; end_h:=split_part(part,'-',2)::int;
   IF start_h NOT BETWEEN 0 AND 23 OR end_h NOT BETWEEN 0 AND 24 OR start_h=end_h OR (start_h=0 AND end_h=24) THEN
    RAISE EXCEPTION 'INVALID_SHIFT_RANGE' USING ERRCODE='22023'; END IF;
   IF end_h<start_h THEN end_h:=end_h+24; END IF;
   IF confirmed IS TRUE THEN
    day_date:=p_week::date+offset_day; start_at:=day_date+make_interval(hours=>start_h); end_at:=day_date+make_interval(hours=>end_h);
    work_hours:=CASE WHEN part='8-17' THEN 8 ELSE end_h-start_h END;
    RETURN NEXT;
   END IF;
  END LOOP;
 END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_operational_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r jsonb; store_key text; needed text; employee_id text;
BEGIN
 r:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME='schedules' THEN
  -- Serialize edits across ALL weeks of one person, including concurrent requests.
  PERFORM pg_advisory_xact_lock(hashtextextended('employee-schedule:'||(r->>'emp_id'),0));
  IF TG_OP<>'DELETE' THEN PERFORM * FROM schedule_segments(r->>'week_date',r->'shifts'); END IF;
  IF r->>'emp_id'=public.current_emp_id() AND NOT (public.has_role('STORE_MANAGER') OR public.has_role('AREA_MANAGER') OR public.is_admin()) THEN
   IF NOT public.has_permission('schedule.register') THEN RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501'; END IF;
   IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
  END IF;
  needed:='schedule.write'; employee_id:=r->>'emp_id';
 ELSIF TG_TABLE_NAME='attendance' THEN
  IF TG_OP<>'DELETE' AND ((r->>'actual_hours')::numeric NOT BETWEEN 0 AND 24 OR length(coalesce(r->>'note',''))>1000) THEN
   RAISE EXCEPTION 'INVALID_ATTENDANCE' USING ERRCODE='22023'; END IF;
  needed:='attendance.write'; employee_id:=r->>'emp_id';
 ELSIF TG_TABLE_NAME='feedbacks' THEN
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
   needed:='attendance.approve'; store_key:=r->>'dept';
  ELSE IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
 ELSE
  needed:=CASE WHEN r->>'status' IN ('approved','rejected') THEN 'schedule.review' ELSE 'schedule.submit' END;
  store_key:=r->>'store_id';
 END IF;
 IF employee_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM employees e,unnest(string_to_array(e.dept,',')) d WHERE e.id=employee_id AND public.has_permission(needed,btrim(d))) THEN
   RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501'; END IF;
 ELSIF NOT public.has_permission(needed,store_key) THEN RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END;
$$;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['schedules','attendance','feedbacks','schedule_weeks'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS aaa_operational_guard ON public.%I',tbl);
  EXECUTE format('CREATE TRIGGER aaa_operational_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_operational_write()',tbl);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.check_schedule_rules() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE shifts jsonb; emp public.employees; cap numeric; hours numeric; violation jsonb:='[]'; pair record; reason text;
BEGIN
 SELECT * INTO emp FROM employees WHERE id=NEW.emp_id;
 SELECT s.shifts INTO shifts FROM schedules s WHERE s.emp_id=NEW.emp_id AND s.week_date=NEW.week_date;
 IF shifts IS NULL THEN RETURN NULL; END IF;
 cap:=least(coalesce(nullif(emp.max_h,0),48),CASE WHEN upper(emp.type) IN ('STPT','PARTTIME') THEN 23 ELSE 48 END);
 SELECT coalesce(sum(work_hours),0) INTO hours FROM schedule_segments(NEW.week_date,shifts);
 IF hours>cap THEN violation:=violation||jsonb_build_array(jsonb_build_object('code','OVER_MAX_HOURS','employeeId',NEW.emp_id,'hours',hours,'limit',cap)); END IF;
 FOR pair IN
  WITH segments AS (
   SELECT x.*,s.week_date FROM schedules s CROSS JOIN LATERAL schedule_segments(s.week_date,s.shifts) x
    WHERE s.emp_id=NEW.emp_id AND s.week_date IN (NEW.week_date,to_char(NEW.week_date::date-7,'YYYY-MM-DD'),to_char(NEW.week_date::date+7,'YYYY-MM-DD'))
  ), ordered AS (
   SELECT *,lag(end_at) OVER(ORDER BY start_at,end_at) previous_end,
    lag(day_date) OVER(ORDER BY start_at,end_at) previous_day,
    lag(week_date) OVER(ORDER BY start_at,end_at) previous_week FROM segments
  ) SELECT * FROM ordered WHERE (week_date=NEW.week_date OR previous_week=NEW.week_date) AND previous_end IS NOT NULL
 LOOP
  IF pair.start_at<pair.previous_end THEN
   RAISE EXCEPTION 'SCHEDULE_OVERLAP: % %',NEW.emp_id,pair.day_date USING ERRCODE='22023';
  END IF;
  IF pair.day_date<>pair.previous_day AND pair.start_at-pair.previous_end<interval '11 hours' THEN
   violation:=violation||jsonb_build_array(jsonb_build_object('code','INSUFFICIENT_REST','employeeId',NEW.emp_id,'date',pair.day_date,'hours',extract(epoch FROM pair.start_at-pair.previous_end)/3600,'limit',11));
  END IF;
 END LOOP;
 IF jsonb_array_length(violation)>0 THEN
  reason:=nullif(btrim(current_setting('app.schedule_override_reason',true)),'');
  IF NOT public.has_permission('schedule.override') OR reason IS NULL OR length(reason)<10 OR length(reason)>500 THEN
   RAISE EXCEPTION 'SCHEDULE_RULES' USING ERRCODE='P0001',DETAIL=violation::text;
  END IF;
  INSERT INTO server_audit_events(actor_id,action,resource_type,resource_id,store_id,new_data,metadata)
   VALUES(public.current_emp_id(),'schedule.override','schedules',NEW.week_date||':'||NEW.emp_id,emp.dept,shifts,jsonb_build_object('reason',reason,'violations',violation,'source','database'));
 END IF;
 RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS schedule_rules_final ON public.schedules;
CREATE CONSTRAINT TRIGGER schedule_rules_final AFTER INSERT OR UPDATE ON public.schedules
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_schedule_rules();

CREATE OR REPLACE FUNCTION public.save_employee_schedule_checked(p_week_date text,p_emp_id text,p_shifts jsonb,p_expect_version integer,p_override_reason text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_override_reason IS NOT NULL AND (NOT public.has_permission('schedule.override') OR length(btrim(p_override_reason)) NOT BETWEEN 10 AND 500) THEN
  RAISE EXCEPTION 'OVERRIDE_NOT_ALLOWED' USING ERRCODE='42501'; END IF;
 PERFORM set_config('app.schedule_override_reason',coalesce(p_override_reason,''),true);
 PERFORM pg_advisory_xact_lock(hashtextextended('employee-schedule:'||p_emp_id,0));
 RETURN public.save_employee_schedule(p_week_date,p_emp_id,p_shifts,p_expect_version);
END;
$$;
CREATE OR REPLACE FUNCTION public.upsert_schedules_bulk_checked(p_rows jsonb,p_override_reason text DEFAULT NULL)
RETURNS TABLE(o_emp_id text,o_week_date text,o_version integer) LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE id_to_lock text;
BEGIN
 IF p_override_reason IS NOT NULL AND (NOT public.has_permission('schedule.override') OR length(btrim(p_override_reason)) NOT BETWEEN 10 AND 500) THEN
  RAISE EXCEPTION 'OVERRIDE_NOT_ALLOWED' USING ERRCODE='42501'; END IF;
 -- Lock people in stable order before any per-week locks; avoid batch inversions.
 FOR id_to_lock IN SELECT DISTINCT value->>'emp_id' FROM jsonb_array_elements(p_rows) ORDER BY 1 LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('employee-schedule:'||id_to_lock,0));
 END LOOP;
 PERFORM set_config('app.schedule_override_reason',coalesce(p_override_reason,''),true);
 RETURN QUERY SELECT * FROM public.upsert_schedules_bulk(p_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.schedule_segments(text,jsonb),public.audit_operational_write(),public.guard_operational_write(),public.check_schedule_rules() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_employee_schedule_checked(text,text,jsonb,integer,text),public.upsert_schedules_bulk_checked(jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_employee_schedule_checked(text,text,jsonb,integer,text),public.upsert_schedules_bulk_checked(jsonb,text) TO authenticated;
-- Payroll is currently an estimate from attendance, not a stored salary ledger.
-- Record the server data read; never trust a client-supplied actor ID.
CREATE OR REPLACE FUNCTION public.get_attendance_audited(p_from date,p_to date)
RETURNS TABLE(emp_id text,work_date date,actual_hours numeric,note text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor text:=public.current_emp_id();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>366 THEN RAISE EXCEPTION 'INVALID_DATE_RANGE' USING ERRCODE='22023'; END IF;
 INSERT INTO server_audit_events(actor_id,action,resource_type,resource_id,metadata)
 VALUES(actor,'payroll.data_read','attendance',p_from::text||':'||p_to::text,jsonb_build_object('source','database','from',p_from,'to',p_to));
 RETURN QUERY SELECT a.emp_id,a.work_date,a.actual_hours,a.note FROM attendance a
 WHERE a.work_date BETWEEN p_from AND p_to AND (
  a.emp_id=actor OR EXISTS(SELECT 1 FROM employees e,unnest(string_to_array(e.dept,',')) d
   WHERE e.id=a.emp_id AND public.has_permission('payroll.view_store',btrim(d)))
 ) ORDER BY a.work_date,a.emp_id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_attendance_audited(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_attendance_audited(date,date) TO authenticated;

CREATE TABLE IF NOT EXISTS public.employee_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),emp_id text NOT NULL REFERENCES employees(id),
 week_date text NOT NULL,kind text NOT NULL CHECK(kind IN ('schedule_changed','schedule_approved')),
 title text NOT NULL,message text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(emp_id,week_date,kind)
);
ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_notifications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.employee_notifications TO authenticated;
DROP POLICY IF EXISTS employee_notifications_own ON public.employee_notifications;
CREATE POLICY employee_notifications_own ON public.employee_notifications FOR SELECT TO authenticated USING(emp_id=public.current_emp_id());
CREATE OR REPLACE FUNCTION public.notify_schedule_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='schedules' THEN
  IF TG_OP='UPDATE' AND NEW.shifts IS NOT DISTINCT FROM OLD.shifts THEN RETURN NULL; END IF;
  IF NEW.emp_id IS DISTINCT FROM public.current_emp_id() THEN
   INSERT INTO employee_notifications(emp_id,week_date,kind,title,message)
   VALUES(NEW.emp_id,NEW.week_date,'schedule_changed','Lịch làm việc đã thay đổi','Lịch tuần '||NEW.week_date||' vừa được cập nhật. Mở lịch để xem chi tiết.')
   ON CONFLICT(emp_id,week_date,kind) DO UPDATE SET updated_at=clock_timestamp(),message=excluded.message;
  END IF;
 ELSIF NEW.status='approved' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  INSERT INTO employee_notifications(emp_id,week_date,kind,title,message)
  SELECT e.id,NEW.week_date,'schedule_approved','Lịch tuần đã được duyệt','Lịch tuần '||NEW.week_date||' tại '||NEW.store_id||' đã được duyệt.'
  FROM employees e WHERE e.is_active AND EXISTS (
   SELECT 1 FROM unnest(string_to_array(e.dept,',')) d WHERE btrim(d)=NEW.store_id
  )
  ON CONFLICT(emp_id,week_date,kind) DO UPDATE SET updated_at=clock_timestamp(),message=excluded.message;
 END IF;
 RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS schedule_notify ON public.schedules;
CREATE TRIGGER schedule_notify AFTER INSERT OR UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.notify_schedule_change();
DROP TRIGGER IF EXISTS schedule_week_notify ON public.schedule_weeks;
CREATE TRIGGER schedule_week_notify AFTER INSERT OR UPDATE ON public.schedule_weeks FOR EACH ROW EXECUTE FUNCTION public.notify_schedule_change();
REVOKE ALL ON FUNCTION public.notify_schedule_change() FROM PUBLIC,anon,authenticated;
COMMIT;
