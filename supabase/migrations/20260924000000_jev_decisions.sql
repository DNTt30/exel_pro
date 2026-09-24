-- Jev automation: service-only commit with canonical snapshot verification.
CREATE TABLE IF NOT EXISTS public.jev_auto_approval_settings (
  store_id text PRIMARY KEY REFERENCES public.stores(id), enabled boolean NOT NULL DEFAULT false,
  min_noul numeric NOT NULL CHECK (min_noul BETWEEN 0.9 AND 1),
  min_confidence numeric NOT NULL CHECK (min_confidence BETWEEN 0.9 AND 1),
  model text NOT NULL, calibrated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.jev_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task text NOT NULL, user_id uuid,
  latency_ms integer, ok boolean NOT NULL, fail_reason text, model text,
  answers jsonb, auto_approved boolean NOT NULL DEFAULT false, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.jev_auto_approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jev_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jev_auto_approval_settings, public.jev_decisions FROM anon, authenticated;
GRANT ALL ON public.jev_auto_approval_settings, public.jev_decisions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules, public.shift_swaps TO service_role;
GRANT SELECT, UPDATE ON public.employees TO service_role;
CREATE OR REPLACE FUNCTION public.save_employee_schedule(
  p_week_date text, p_emp_id text, p_shifts jsonb, p_expect_version integer DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE current_version integer; next_version integer;
BEGIN
  IF auth.uid() IS NULL AND current_user <> 'service_role' THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
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

CREATE OR REPLACE FUNCTION public.approve_shift_swap_atomic_v2(p_swap_id uuid,p_manager_note text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.shift_swaps%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.shift_swaps WHERE id=p_swap_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SWAP_NOT_FOUND'; END IF;
  IF NOT public.can_manage_store(s.store) AND current_user <> 'service_role' THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
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
  IF NEW.status='approved' AND NOT public.can_manage_store(OLD.store) AND current_user <> 'service_role' THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF NEW.status='rejected' AND NOT public.can_manage_store(OLD.store)
    AND NOT (OLD.status='pending_partner' AND OLD.to_emp_id=public.current_emp_id()) THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
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

CREATE OR REPLACE FUNCTION public.jev_approve_swap(
  p_swap_id uuid, p_snapshot jsonb, p_risk numeric, p_noul numeric, p_confidence numeric, p_model text
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.shift_swaps%ROWTYPE; config public.jev_auto_approval_settings%ROWTYPE;
  r record; actual integer; actual_shifts jsonb; staff jsonb;
BEGIN
  IF current_user <> 'service_role' THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  SELECT * INTO s FROM public.shift_swaps WHERE id=p_swap_id FOR UPDATE;
  IF NOT FOUND OR s.status <> 'pending_manager' THEN RETURN false; END IF;
  SELECT * INTO config FROM public.jev_auto_approval_settings WHERE store_id=s.store FOR SHARE;
  IF NOT FOUND OR NOT config.enabled OR p_model IS DISTINCT FROM config.model
    OR p_risk IS NULL OR p_risk NOT BETWEEN 0 AND 60
    OR p_noul IS NULL OR p_noul NOT BETWEEN config.min_noul AND 1
    OR p_confidence IS NULL OR p_confidence NOT BETWEEN config.min_confidence AND 1 THEN RETURN false; END IF;
  IF p_snapshot->'versions'->s.week_date->>s.from_emp_id IS NULL
    OR p_snapshot->'versions'->s.week_date->>s.to_emp_id IS NULL THEN RETURN false; END IF;
  -- Very short commit section: also blocks INSERT of previously absent context rows.
  -- Model/network work always happens BEFORE this transaction.
  LOCK TABLE public.schedules IN SHARE ROW EXCLUSIVE MODE;
  PERFORM 1 FROM public.employees WHERE id IN (s.from_emp_id,s.to_emp_id) ORDER BY id FOR SHARE;
  SELECT jsonb_agg(jsonb_build_object('id',id,'type',type,'dept',dept,'max_h',max_h,'is_active',is_active) ORDER BY id)
    INTO staff FROM public.employees WHERE id IN (s.from_emp_id,s.to_emp_id);
  IF staff IS DISTINCT FROM p_snapshot->'employees' THEN RETURN false; END IF;
  FOR r IN SELECT w.key AS week, e.key AS emp, e.value::integer AS version
    FROM jsonb_each(p_snapshot->'versions') w CROSS JOIN LATERAL jsonb_each_text(w.value) e ORDER BY w.key,e.key LOOP
    SELECT version,shifts INTO actual,actual_shifts FROM public.schedules WHERE week_date=r.week AND emp_id=r.emp FOR UPDATE;
    IF coalesce(actual,0)<>r.version THEN RETURN false; END IF;
    -- Also catch legacy/direct writes that did not increment version.
    IF actual_shifts IS DISTINCT FROM p_snapshot->'shifts'->r.week->r.emp THEN RETURN false; END IF;
  END LOOP;
  PERFORM public.approve_shift_swap_atomic_v2(s.id,'Jev: tự duyệt sau kiểm tra rule và phiên bản lịch');
  INSERT INTO public.jev_decisions(task,ok,model,answers,auto_approved)
    VALUES('shift_swap_commit',true,p_model,jsonb_build_object('swap_id',s.id,'risk_level',p_risk,'noul',p_noul),true);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.jev_approve_swap(uuid,jsonb,numeric,numeric,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jev_approve_swap(uuid,jsonb,numeric,numeric,numeric,text),
  public.approve_shift_swap_atomic_v2(uuid,text), public.save_employee_schedule(text,text,jsonb,integer) TO service_role;

ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS expiry_time time;
ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS expiry_time_2 time;
ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS average_sales_per_hour numeric CHECK (average_sales_per_hour >= 0);
ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS triage_policy jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Replace a shelf atomically and preserve hour-level expiry data.
CREATE OR REPLACE FUNCTION public.replace_shelf_items_atomic(
  p_shelf_id uuid, p_store_id text, p_items jsonb, p_updated_by text
) RETURNS SETOF public.shelf_items LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('shelf:'||p_shelf_id::text,0));
  PERFORM 1 FROM public.store_shelves WHERE id=p_shelf_id AND store_id=p_store_id
    AND (public.can_manage_store(store_id) OR public.current_emp_id()=ANY(string_to_array(assignee_id,',')));
  IF NOT FOUND THEN RAISE EXCEPTION 'SHELF_NOT_FOUND'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_ITEMS'; END IF;
  DELETE FROM public.shelf_items WHERE shelf_id=p_shelf_id;
  RETURN QUERY INSERT INTO public.shelf_items(shelf_id,store_id,product_name,sku,qty,expiry_date,expiry_date_2,
    expiry_time,expiry_time_2,average_sales_per_hour,triage_policy,note,updated_by)
  SELECT p_shelf_id,p_store_id,r.product_name,r.sku,r.qty,r.expiry_date,r.expiry_date_2,r.expiry_time,r.expiry_time_2,
    r.average_sales_per_hour,coalesce(r.triage_policy,'{}'::jsonb),r.note,public.current_emp_id()
  FROM jsonb_to_recordset(p_items) AS r(product_name text,sku text,qty numeric,expiry_date date,expiry_date_2 date,
    expiry_time time,expiry_time_2 time,average_sales_per_hour numeric,triage_policy jsonb,note text) RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_shelf_items_atomic(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_shelf_items_atomic(uuid,text,jsonb,text) TO authenticated;
