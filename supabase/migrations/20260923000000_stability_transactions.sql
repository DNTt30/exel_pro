-- Deploy before the frontend version that requires optimistic versions and atomic swaps.
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS updated_by text;

-- Use the same workflow vocabulary as the app. Remove the old transition guard first.
DROP TRIGGER IF EXISTS trg_weeks_guard ON public.schedule_weeks;
ALTER TABLE public.schedule_weeks DROP CONSTRAINT IF EXISTS ck_weeks_status;
UPDATE public.schedule_weeks SET status='pending' WHERE status='submitted';
ALTER TABLE public.schedule_weeks ADD CONSTRAINT ck_weeks_status
  CHECK (status IN ('draft','pending','approved','rejected'));

CREATE OR REPLACE FUNCTION public.weeks_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('week:'||NEW.store_id||':'||NEW.week_date,0));
  -- ON CONFLICT runs INSERT triggers before UPDATE triggers. Validate the existing
  -- row transition in the UPDATE branch, while keeping its row locked.
  IF TG_OP='INSERT' THEN
    PERFORM 1 FROM public.schedule_weeks WHERE store_id=NEW.store_id AND week_date=NEW.week_date FOR UPDATE;
    IF FOUND THEN RETURN NEW; END IF;
  END IF;
  IF NOT public.can_manage_store(NEW.store_id) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF TG_OP='UPDATE' AND (NEW.store_id IS DISTINCT FROM OLD.store_id OR NEW.week_date IS DISTINCT FROM OLD.week_date) THEN
    RAISE EXCEPTION 'WEEK_ID_IMMUTABLE';
  END IF;
  IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NEW.status IN ('approved','rejected') AND NOT (public.is_admin() OR public.has_role('AREA_MANAGER')) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Only AM/admin can review';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status NOT IN ('draft','pending') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  ELSIF NOT (
    (OLD.status IN ('draft','rejected') AND NEW.status='pending') OR
    (OLD.status='pending' AND NEW.status IN ('approved','rejected')) OR
    (OLD.status='approved' AND NEW.status='rejected') OR
    (OLD.status='rejected' AND NEW.status='draft')
  ) THEN RAISE EXCEPTION 'INVALID_TRANSITION: % -> %', OLD.status, NEW.status; END IF;
  IF NEW.status='pending' THEN NEW.submitted_by:=public.current_emp_id(); NEW.submitted_at:=now(); END IF;
  IF NEW.status IN ('approved','rejected') THEN NEW.reviewed_by:=public.current_emp_id(); NEW.reviewed_at:=now(); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_weeks_guard BEFORE INSERT OR UPDATE ON public.schedule_weeks
  FOR EACH ROW EXECUTE FUNCTION public.weeks_guard();

-- Employees may register their own shifts; management remains scoped to owned stores.
DROP POLICY IF EXISTS p1_sch_all ON public.schedules;
CREATE POLICY p1_sch_all ON public.schedules FOR ALL TO authenticated
  USING (public.current_emp_id() IS NOT NULL AND (
    emp_id=public.current_emp_id() OR public.is_admin() OR EXISTS (
      SELECT 1 FROM public.employees e, unnest(string_to_array(e.dept,',')) d
      WHERE e.id=emp_id AND public.can_manage_store(trim(d))
    )))
  WITH CHECK (public.current_emp_id() IS NOT NULL AND (
    emp_id=public.current_emp_id() OR public.is_admin() OR EXISTS (
      SELECT 1 FROM public.employees e, unnest(string_to_array(e.dept,',')) d
      WHERE e.id=emp_id AND public.can_manage_store(trim(d))
    )));

-- Applies even to callers bypassing the RPC, and to both home and covering stores.
CREATE OR REPLACE FUNCTION public.guard_schedule_lock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE row_emp text; row_week text; row_shifts jsonb; old_shifts jsonb:='{}'; home_dept text; target text;
BEGIN
  IF TG_OP='DELETE' THEN row_emp:=OLD.emp_id; row_week:=OLD.week_date; row_shifts:=OLD.shifts;
  ELSE row_emp:=NEW.emp_id; row_week:=NEW.week_date; row_shifts:=NEW.shifts; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.emp_id IS DISTINCT FROM OLD.emp_id OR NEW.week_date IS DISTINCT FROM OLD.week_date THEN
      RAISE EXCEPTION 'SCHEDULE_ID_IMMUTABLE';
    END IF;
    old_shifts:=OLD.shifts;
  END IF;
  SELECT dept INTO home_dept FROM public.employees WHERE id=row_emp;
  FOR target IN
    SELECT trim(d) FROM unnest(string_to_array(home_dept,',')) d
    UNION
    SELECT CASE WHEN jsonb_typeof(value)='object' THEN value->>'covering_store'
      WHEN jsonb_typeof(value)='string' AND value#>>'{}' LIKE '%\_%' ESCAPE '\'
        THEN split_part(value#>>'{}','_',2) END
    FROM (SELECT value FROM jsonb_each(row_shifts) UNION ALL SELECT value FROM jsonb_each(old_shifts)) cells
    ORDER BY 1
  LOOP
    IF target IS NULL OR target='' THEN CONTINUE; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('week:'||target||':'||row_week,0));
    IF NOT public.is_week_editable(target,row_week) THEN RAISE EXCEPTION 'WEEK_LOCKED'; END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stability_schedule_lock ON public.schedules;
CREATE TRIGGER stability_schedule_lock BEFORE INSERT OR UPDATE OR DELETE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.guard_schedule_lock();

-- Remove the obsolete three-argument overload to avoid PostgREST ambiguity.
DROP FUNCTION IF EXISTS public.save_employee_schedule(text,text,jsonb);
CREATE OR REPLACE FUNCTION public.save_employee_schedule(
  p_week_date text, p_emp_id text, p_shifts jsonb, p_expect_version integer DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE current_version integer; next_version integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_expect_version IS NULL OR p_expect_version < 0 THEN RAISE EXCEPTION 'EXPECTED_VERSION_REQUIRED'; END IF;
  IF p_week_date !~ '^\d{4}-\d{2}-\d{2}$' OR extract(isodow FROM p_week_date::date)<>1 THEN
    RAISE EXCEPTION 'INVALID_WEEK';
  END IF;
  IF jsonb_typeof(p_shifts) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'INVALID_SHIFTS'; END IF;
  -- Also locks creation of a currently missing row, which SELECT FOR UPDATE cannot do.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_week_date||':'||p_emp_id,0));
  SELECT version INTO current_version FROM public.schedules WHERE week_date=p_week_date AND emp_id=p_emp_id FOR UPDATE;
  IF coalesce(current_version,0)<>p_expect_version THEN
    RAISE EXCEPTION 'CONFLICT: schedule changed' USING ERRCODE='40001';
  END IF;
  IF current_version IS NULL THEN
    INSERT INTO public.schedules(week_date,emp_id,shifts,version,updated_by)
      VALUES(p_week_date,p_emp_id,p_shifts,1,public.current_emp_id()) RETURNING version INTO next_version;
  ELSE
    UPDATE public.schedules SET shifts=p_shifts,version=version+1,updated_at=now(),updated_by=public.current_emp_id()
      WHERE week_date=p_week_date AND emp_id=p_emp_id RETURNING version INTO next_version;
    IF NOT FOUND THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  END IF;
  RETURN next_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_schedules_bulk(p_rows jsonb)
RETURNS TABLE(o_emp_id text,o_week_date text,o_version integer)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r record;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_ROWS'; END IF;
  FOR r IN SELECT * FROM jsonb_to_recordset(p_rows)
    AS x(week_date text,emp_id text,shifts jsonb,expect_version integer) ORDER BY week_date,emp_id LOOP
    o_version:=public.save_employee_schedule(r.week_date,r.emp_id,r.shifts,r.expect_version);
    o_emp_id:=r.emp_id; o_week_date:=r.week_date; RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_shift_swap_atomic_v2(p_swap_id uuid,p_manager_note text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.shift_swaps%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.shift_swaps WHERE id=p_swap_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SWAP_NOT_FOUND'; END IF;
  IF NOT public.can_manage_store(s.store) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF s.status='approved' THEN RETURN true; END IF;
  UPDATE public.shift_swaps SET status='approved',manager_note=coalesce(p_manager_note,manager_note),resolved_at=now()
    WHERE id=p_swap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  RETURN true;
END;
$$;

-- Stop participants from self-approving through direct UPDATE.
CREATE OR REPLACE FUNCTION public.guard_swap_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.shift_swaps%ROWTYPE; a jsonb; b jsonb; a_new jsonb; b_new jsonb;
  av integer; bv integer; employee_id text;
BEGIN
  IF NEW.from_emp_id<>OLD.from_emp_id OR NEW.to_emp_id<>OLD.to_emp_id OR NEW.week_date<>OLD.week_date
    OR NEW.store<>OLD.store OR NEW.from_day<>OLD.from_day OR NEW.to_day<>OLD.to_day
    OR NEW.from_shift<>OLD.from_shift OR NEW.to_shift<>OLD.to_shift THEN RAISE EXCEPTION 'SWAP_IMMUTABLE'; END IF;
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF OLD.status IN ('approved','rejected','cancelled') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF NEW.status IN ('approved','rejected') AND NOT public.can_manage_store(OLD.store) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF NEW.status='approved' AND OLD.status<>'pending_manager' THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF NEW.status='pending_manager' AND (OLD.status<>'pending_partner' OR NOT (OLD.to_emp_id=public.current_emp_id() OR public.can_manage_store(OLD.store))) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF NEW.status='cancelled' AND NOT (OLD.from_emp_id=public.current_emp_id() OR public.can_manage_store(OLD.store)) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF NEW.status NOT IN ('approved','rejected','cancelled','pending_manager') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF NEW.status='approved' THEN
    s:=OLD;
  IF s.status<>'pending_manager' OR s.from_emp_id=s.to_emp_id THEN RAISE EXCEPTION 'INVALID_SWAP_STATUS'; END IF;
  IF s.from_day NOT IN ('T2','T3','T4','T5','T6','T7','CN') OR s.to_day NOT IN ('T2','T3','T4','T5','T6','T7','CN') THEN
    RAISE EXCEPTION 'INVALID_DAY';
  END IF;
  FOR employee_id IN SELECT unnest(ARRAY[s.from_emp_id,s.to_emp_id]) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(s.week_date||':'||employee_id,0));
  END LOOP;
  SELECT shifts,version INTO a,av FROM public.schedules WHERE week_date=s.week_date AND emp_id=s.from_emp_id FOR UPDATE;
  SELECT shifts,version INTO b,bv FROM public.schedules WHERE week_date=s.week_date AND emp_id=s.to_emp_id FOR UPDATE;
  IF a IS NULL OR b IS NULL THEN RAISE EXCEPTION 'SCHEDULE_NOT_FOUND'; END IF;
  -- Compare the requested shifts with current data before applying an old request.
  IF lower(split_part(coalesce(a->s.from_day->>'shift',a->>s.from_day,''),'_',1))<>lower(s.from_shift)
    OR lower(split_part(coalesce(b->s.to_day->>'shift',b->>s.to_day,''),'_',1))<>lower(s.to_shift) THEN
    RAISE EXCEPTION 'CONFLICT: requested shifts changed' USING ERRCODE='40001';
  END IF;
  a_new:=jsonb_set(a,ARRAY[s.from_day],coalesce(b->s.from_day,'""'::jsonb),true);
  b_new:=jsonb_set(b,ARRAY[s.from_day],coalesce(a->s.from_day,'""'::jsonb),true);
  IF s.from_day<>s.to_day THEN
    a_new:=jsonb_set(a_new,ARRAY[s.to_day],coalesce(b->s.to_day,'""'::jsonb),true);
    b_new:=jsonb_set(b_new,ARRAY[s.to_day],coalesce(a->s.to_day,'""'::jsonb),true);
  END IF;
  PERFORM public.save_employee_schedule(s.week_date,s.from_emp_id,a_new,av);
  PERFORM public.save_employee_schedule(s.week_date,s.to_emp_id,b_new,bv);
    NEW.resolved_at:=now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stability_swap_transition ON public.shift_swaps;
CREATE TRIGGER stability_swap_transition BEFORE UPDATE ON public.shift_swaps
  FOR EACH ROW EXECUTE FUNCTION public.guard_swap_transition();

-- Removing an attendance override must be permitted for its managing stores.
DROP POLICY IF EXISTS stability_attendance_delete ON public.attendance;
CREATE POLICY stability_attendance_delete ON public.attendance FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.employees e, unnest(string_to_array(e.dept,',')) d
    WHERE e.id=emp_id AND public.can_manage_store(trim(d)))
);

REVOKE ALL ON FUNCTION public.save_employee_schedule(text,text,jsonb,integer),
  public.upsert_schedules_bulk(jsonb), public.approve_shift_swap_atomic_v2(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_employee_schedule(text,text,jsonb,integer),
  public.upsert_schedules_bulk(jsonb), public.approve_shift_swap_atomic_v2(uuid,text) TO authenticated;

-- Restrict a legacy broad SELECT to signed-in, active app identities.
DROP POLICY IF EXISTS stability_schedule_identity ON public.schedules;
CREATE POLICY stability_schedule_identity ON public.schedules AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.current_emp_id() IS NOT NULL) WITH CHECK (public.current_emp_id() IS NOT NULL);
CREATE OR REPLACE FUNCTION public.admin_reset_employee_password_flag(p_emp_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.manages_employee(p_emp_id) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  UPDATE public.employees SET password_changed_at=NULL WHERE id=p_emp_id;
  UPDATE public.app_profiles SET credential_set_at=NULL WHERE emp_id=p_emp_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_reset_employee_password_flag(text), public.mark_my_password_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_employee_password_flag(text), public.mark_my_password_changed() TO authenticated;

DO $$ DECLARE cmd text; predicate text:='emp_id=public.current_emp_id() OR public.manages_employee(emp_id)';
BEGIN
  FOREACH cmd IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.schedules','stability_bound_'||lower(cmd));
    IF cmd='INSERT' THEN
      EXECUTE format('CREATE POLICY stability_bound_insert ON public.schedules AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)',predicate);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.schedules AS RESTRICTIVE FOR %s TO authenticated USING (%s)','stability_bound_'||lower(cmd),cmd,predicate);
    END IF;
  END LOOP;
END $$;

-- Versioned lookup avoids changing the result type of an existing login_lookup.
CREATE OR REPLACE FUNCTION public.login_lookup_v2(p_ma text)
RETURNS TABLE(id text,name text,dept text,role text,type text,job_title text,max_h numeric,is_active boolean,
  created_at timestamptz,password_changed_at timestamptz,password_deadline timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT e.id,e.name,e.dept,e.role,e.type,e.job_title,e.max_h,e.is_active,
    e.created_at,e.password_changed_at,e.password_deadline FROM public.employees e
  WHERE p_ma ~ '^\d{9}$' AND e.id=p_ma LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.login_lookup_v2(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_lookup_v2(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.guard_week_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('week:'||OLD.store_id||':'||OLD.week_date,0));
  IF OLD.status IN ('pending','approved') THEN RAISE EXCEPTION 'WEEK_LOCKED'; END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS stability_week_delete ON public.schedule_weeks;
CREATE TRIGGER stability_week_delete BEFORE DELETE ON public.schedule_weeks
  FOR EACH ROW EXECUTE FUNCTION public.guard_week_delete();

-- A resolution with a corrected shift must either commit both changes or neither.
CREATE OR REPLACE FUNCTION public.resolve_feedback_atomic_v2(
  p_feedback_id uuid,p_status text,p_resolution_note text DEFAULT '',p_schedule jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE f public.feedbacks%ROWTYPE; schedule_row public.schedules%ROWTYPE;
  week_key text; day_key text; new_version integer; next_shifts jsonb; result jsonb:=NULL;
BEGIN
  SELECT * INTO f FROM public.feedbacks WHERE id=p_feedback_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FEEDBACK_NOT_FOUND'; END IF;
  IF NOT coalesce(public.can_manage_store(f.dept),false) OR f.emp_id=public.current_emp_id() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF f.status NOT IN ('pending',p_status) THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF p_schedule IS NOT NULL THEN
    IF p_status<>'approved' OR jsonb_typeof(p_schedule) IS DISTINCT FROM 'object'
      OR p_schedule->>'empId' IS DISTINCT FROM f.emp_id THEN RAISE EXCEPTION 'INVALID_CORRECTION'; END IF;
    week_key:=p_schedule->>'week'; day_key:=p_schedule->>'day';
    IF week_key IS NULL OR day_key IS NULL OR day_key NOT IN ('T2','T3','T4','T5','T6','T7','CN')
      OR NOT p_schedule ? 'shiftCode' THEN RAISE EXCEPTION 'INVALID_CORRECTION'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(week_key||':'||f.emp_id,0));
    SELECT * INTO schedule_row FROM public.schedules WHERE week_date=week_key AND emp_id=f.emp_id FOR UPDATE;
    IF f.status='pending' THEN
      next_shifts:=jsonb_set(coalesce(schedule_row.shifts,'{}'::jsonb),ARRAY[day_key],p_schedule->'shiftCode',true);
      new_version:=public.save_employee_schedule(week_key,f.emp_id,next_shifts,(p_schedule->>'expect_version')::integer);
    ELSE
      next_shifts:=schedule_row.shifts; new_version:=schedule_row.version;
    END IF;
    result:=jsonb_build_object('emp_id',f.emp_id,'week_date',week_key,'shifts',next_shifts,'version',new_version);
  END IF;
  IF f.status='pending' THEN
    UPDATE public.feedbacks SET status=p_status,resolution_note=p_resolution_note WHERE id=p_feedback_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_feedback_atomic_v2(uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_feedback_atomic_v2(uuid,text,text,jsonb) TO authenticated;

DROP POLICY IF EXISTS stability_feedback_resolution ON public.feedbacks;
CREATE POLICY stability_feedback_resolution ON public.feedbacks AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (emp_id<>public.current_emp_id()) WITH CHECK (emp_id<>public.current_emp_id());
DROP POLICY IF EXISTS stability_feedback_initial_status ON public.feedbacks;
CREATE POLICY stability_feedback_initial_status ON public.feedbacks AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (status='pending');
