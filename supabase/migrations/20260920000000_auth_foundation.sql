-- Dependencies required by the 20260921 migrations on a clean installation.
-- Authorization is derived from server-owned employee records, never user_metadata.
CREATE TABLE IF NOT EXISTS public.app_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  emp_id text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_profiles ADD COLUMN IF NOT EXISTS credential_set_at timestamptz;
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('ADMIN','AREA_MANAGER','STORE_MANAGER','FULL_TIME','PART_TIME','EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.current_emp_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT split_part(u.email, '@', 1) FROM auth.users u
  WHERE u.id = auth.uid() AND u.email LIKE '%@ofc.app'
    AND (u.email = 'admin@ofc.app' OR EXISTS (
      SELECT 1 FROM public.employees e WHERE e.id = split_part(u.email, '@', 1) AND e.is_active
    ));
$$;

CREATE OR REPLACE FUNCTION public.has_role(r public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN r = 'ADMIN' THEN public.current_emp_id() = 'admin'
    ELSE EXISTS (SELECT 1 FROM public.employees e WHERE e.id = public.current_emp_id() AND e.is_active AND
      CASE r
        WHEN 'AREA_MANAGER' THEN
          upper(coalesce(e.role,'')) IN ('OFC','AM','AREA_MANAGER') OR upper(e.type) IN ('OFC','AM','AREA_MANAGER')
          OR upper(coalesce(e.job_title,'')) IN ('OFC','AM','AREA_MANAGER')
          OR concat_ws(' ', e.role, e.job_title) ILIKE '%khu vực%'
        WHEN 'STORE_MANAGER' THEN
          upper(coalesce(e.role,'')) IN ('SM','STORE_MANAGER') OR upper(e.type) IN ('SM','STORE_MANAGER')
          OR upper(coalesce(e.job_title,'')) IN ('SM','STORE_MANAGER')
          OR concat_ws(' ', e.role, e.job_title) ILIKE '%cửa hàng trưởng%'
          OR concat_ws(' ', e.role, e.job_title) ILIKE '%quản lý%'
        WHEN 'FULL_TIME' THEN upper(e.type) IN ('STFT','CSR_NEW','FULLTIME')
        WHEN 'PART_TIME' THEN upper(e.type) IN ('STPT','PARTTIME')
        WHEN 'EMPLOYEE' THEN true ELSE false END
    ) END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_emp_id() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.my_member_stores() RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT trim(d) FROM public.employees e, unnest(string_to_array(e.dept, ',')) d
  WHERE e.id = public.current_emp_id() AND e.is_active AND trim(d) <> '';
$$;

CREATE OR REPLACE FUNCTION public.my_managed_stores() RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.stores s WHERE public.is_admin() OR public.has_role('AREA_MANAGER')
    OR (public.has_role('STORE_MANAGER') AND s.id IN (SELECT public.my_member_stores()));
$$;

CREATE OR REPLACE FUNCTION public.dept_in_scope(p_dept text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM unnest(string_to_array(p_dept, ',')) d
    WHERE trim(d) IN (SELECT public.my_member_stores()) OR trim(d) IN (SELECT public.my_managed_stores()));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_store(p_store text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR p_store IN (SELECT public.my_managed_stores());
$$;

CREATE OR REPLACE FUNCTION public.ensure_app_profile_v2() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE employee_id text := public.current_emp_id();
BEGIN
  IF employee_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  INSERT INTO public.app_profiles(id, emp_id) VALUES(auth.uid(), employee_id)
    ON CONFLICT(id) DO UPDATE SET emp_id = excluded.emp_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_lookup(p_ma text)
RETURNS TABLE (id text, name text, dept text, role text, type text, job_title text, max_h numeric, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id,e.name,e.dept,e.role,e.type,e.job_title,e.max_h,e.is_active
  FROM public.employees e WHERE p_ma ~ '^\d{9}$' AND e.id = p_ma LIMIT 1;
$$;

-- Apply bounded policies even when legacy permissive policies exist. A restrictive
-- policy is ANDed with all permissive policies; old open_* rules cannot widen it.
CREATE OR REPLACE FUNCTION public.manages_employee(p_emp_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.employees e, unnest(string_to_array(e.dept,',')) d
    WHERE e.id=p_emp_id AND public.can_manage_store(trim(d)));
$$;

DO $$
DECLARE t text; command text; predicate text; read_predicate text; write_predicate text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stores','employees','attendance','feedbacks','shift_swaps','store_shelves','shelf_items','schedule_weeks'] LOOP
    read_predicate := CASE t
      WHEN 'stores' THEN 'public.current_emp_id() IS NOT NULL'
      -- The staff directory is shared for cross-store covering and shift requests.
      WHEN 'employees' THEN 'public.current_emp_id() IS NOT NULL'
      WHEN 'attendance' THEN 'emp_id=public.current_emp_id() OR public.manages_employee(emp_id)'
      WHEN 'feedbacks' THEN 'emp_id=public.current_emp_id() OR public.can_manage_store(dept)'
      WHEN 'shift_swaps' THEN 'from_emp_id=public.current_emp_id() OR to_emp_id=public.current_emp_id() OR public.can_manage_store(store)'
      WHEN 'store_shelves' THEN 'public.dept_in_scope(store_id)'
      WHEN 'shelf_items' THEN 'public.dept_in_scope(store_id)'
      WHEN 'schedule_weeks' THEN 'public.current_emp_id() IS NOT NULL' END;
    write_predicate := CASE t
      WHEN 'stores' THEN 'public.can_manage_store(id)'
      WHEN 'employees' THEN 'public.manages_employee(id)'
      WHEN 'attendance' THEN 'public.manages_employee(emp_id)'
      WHEN 'feedbacks' THEN 'public.can_manage_store(dept)'
      WHEN 'shift_swaps' THEN 'public.can_manage_store(store)'
      WHEN 'store_shelves' THEN 'public.can_manage_store(store_id)'
      WHEN 'shelf_items' THEN 'public.can_manage_store(store_id) OR EXISTS (SELECT 1 FROM public.store_shelves sh WHERE sh.id=shelf_id AND sh.store_id=shelf_items.store_id AND public.current_emp_id()=ANY(string_to_array(sh.assignee_id,'','')))'
      WHEN 'schedule_weeks' THEN 'public.can_manage_store(store_id)' END;
    FOREACH command IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      predicate := CASE WHEN command='SELECT' THEN read_predicate ELSE write_predicate END;
      IF t='stores' AND command IN ('INSERT','DELETE') THEN predicate:='public.is_admin()'; END IF;
      IF t='employees' AND command='INSERT' THEN predicate:='public.is_admin() OR EXISTS (SELECT 1 FROM unnest(string_to_array(dept,'','')) d WHERE public.can_manage_store(trim(d)))'; END IF;
      IF t='feedbacks' AND command='INSERT' THEN predicate:=predicate||' OR (emp_id=public.current_emp_id() AND status=''pending'' AND public.dept_in_scope(dept))'; END IF;
      IF t='shift_swaps' AND command='INSERT' THEN predicate:='from_emp_id=public.current_emp_id() AND status=''pending_partner'' AND public.dept_in_scope(store)'; END IF;
      IF t='shift_swaps' AND command='UPDATE' THEN predicate:=predicate||' OR from_emp_id=public.current_emp_id() OR to_emp_id=public.current_emp_id()'; END IF;
      IF t='shift_swaps' AND command='DELETE' THEN predicate:=predicate||' OR (from_emp_id=public.current_emp_id() AND status=''pending_partner'')'; END IF;
      predicate:='public.current_emp_id() IS NOT NULL AND ('||predicate||')';
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','stability_allow_'||lower(command),t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','stability_bound_'||lower(command),t);
      IF command='INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)','stability_allow_insert',t,predicate);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)','stability_bound_insert',t,predicate);
      ELSE
        EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (%s)','stability_allow_'||lower(command),t,command,predicate);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (%s)','stability_bound_'||lower(command),t,command,predicate);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Manager appointments require Admin/AM; ordinary staff CRUD stays available to SM.
CREATE OR REPLACE FUNCTION public.employee_is_manager(p_role text,p_type text,p_title text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT upper(coalesce(p_role,'')) IN ('ADMIN','OFC','AM','AREA_MANAGER','SM','STORE_MANAGER')
    OR upper(coalesce(p_type,'')) IN ('ADMIN','OFC','AM','AREA_MANAGER','SM','STORE_MANAGER')
    OR upper(coalesce(p_title,'')) IN ('ADMIN','OFC','AM','AREA_MANAGER','SM','STORE_MANAGER')
    OR concat_ws(' ',p_role,p_title) ILIKE ANY(ARRAY['%quản lý%','%cửa hàng trưởng%','%khu vực%']);
$$;
CREATE OR REPLACE FUNCTION public.guard_employee_authority() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF public.is_admin() OR public.has_role('AREA_MANAGER') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'EMPLOYEE_ID_IMMUTABLE'; END IF;
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.type IS DISTINCT FROM OLD.type
      OR NEW.job_title IS DISTINCT FROM OLD.job_title OR NEW.dept IS DISTINCT FROM OLD.dept
      OR NEW.is_active IS DISTINCT FROM OLD.is_active)
      AND (public.employee_is_manager(NEW.role,NEW.type,NEW.job_title)
        OR public.employee_is_manager(OLD.role,OLD.type,OLD.job_title)) THEN
      RAISE EXCEPTION 'AUTHORITY_FIELDS_REQUIRE_ADMIN_OR_AM';
    END IF;
  ELSIF public.employee_is_manager(NEW.role,NEW.type,NEW.job_title) THEN
    RAISE EXCEPTION 'AUTHORITY_FIELDS_REQUIRE_ADMIN_OR_AM';
  END IF;
  IF TG_OP='INSERT' OR NEW.dept IS DISTINCT FROM OLD.dept THEN
    IF EXISTS (SELECT 1 FROM unnest(string_to_array(NEW.dept,',')) d WHERE NOT public.can_manage_store(trim(d))) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stability_employee_authority ON public.employees;
CREATE TRIGGER stability_employee_authority BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.guard_employee_authority();
ALTER TABLE public.user_store_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_store_roles FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.login_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_lookup(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_app_profile_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_app_profile_v2() TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores, public.employees, public.schedules,
  public.schedule_weeks, public.attendance, public.feedbacks, public.shift_swaps,
  public.store_shelves, public.shelf_items TO authenticated;

REVOKE ALL ON public.stores, public.employees, public.schedules, public.schedule_weeks,
  public.attendance, public.feedbacks, public.shift_swaps, public.store_shelves, public.shelf_items FROM anon;
