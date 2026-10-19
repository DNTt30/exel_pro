-- Run after sql_database_catchup_20260928.sql. One deployment = one organization.
-- Custom names are display data ONLY; existing canonical roles still enforce RLS.
BEGIN;
CREATE TABLE IF NOT EXISTS public.workspace_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 2 AND 60 AND name !~ '[[:cntrl:]<>]'),
  permission_group text NOT NULL CHECK (permission_group IN ('staff','sm','am')),
  is_active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_role_name_unique ON public.workspace_roles(lower(name));
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS workspace_role_id uuid REFERENCES public.workspace_roles(id);
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.workspace_roles TO authenticated;
DROP POLICY IF EXISTS workspace_roles_read ON public.workspace_roles;
CREATE POLICY workspace_roles_read ON public.workspace_roles FOR SELECT TO authenticated
USING (public.current_emp_id() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.save_workspace_role(
  p_name text, p_group text, p_id uuid DEFAULT NULL, p_revision integer DEFAULT NULL, p_active boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE saved public.workspace_roles;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'ROLE_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.workspace_roles(name, permission_group, is_active)
    VALUES (btrim(p_name), p_group, p_active) RETURNING * INTO saved;
  ELSE
    SELECT * INTO saved FROM public.workspace_roles WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR p_revision IS DISTINCT FROM saved.revision THEN
      RAISE EXCEPTION 'ROLE_CONFLICT' USING ERRCODE = '40001';
    END IF;
    IF p_group IS DISTINCT FROM saved.permission_group THEN
      RAISE EXCEPTION 'ROLE_GROUP_IMMUTABLE' USING ERRCODE = '22023';
    END IF;
    UPDATE public.workspace_roles SET name = btrim(p_name), is_active = p_active, revision = revision + 1
    WHERE id = p_id RETURNING * INTO saved;
  END IF;
  INSERT INTO public.admin_logs(actor_id, actor_name, action, target, detail)
  VALUES ('admin','Admin','workspace_role_saved',saved.id::text,
    jsonb_build_object('name',saved.name,'group',saved.permission_group,'active',saved.is_active)::text);
  RETURN to_jsonb(saved);
END;
$$;

-- Also protects direct REST writes, not only the assignment RPC.
CREATE OR REPLACE FUNCTION public.guard_workspace_role_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE previous_id uuid; role_changed boolean; target_role public.workspace_roles; canonical text;
BEGIN
  IF TG_OP = 'UPDATE' THEN previous_id := OLD.workspace_role_id; END IF;
  role_changed := NEW.workspace_role_id IS DISTINCT FROM previous_id;
  IF role_changed THEN
    IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
      RAISE EXCEPTION 'ROLE_ADMIN_REQUIRED' USING ERRCODE = '42501';
    END IF;
    IF NEW.id = 'admin' OR NEW.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'ROLE_EMPLOYEE_UNAVAILABLE' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF NEW.workspace_role_id IS NOT NULL THEN
    SELECT * INTO target_role FROM public.workspace_roles WHERE id = NEW.workspace_role_id FOR SHARE;
    IF NOT FOUND OR (role_changed AND NOT target_role.is_active) THEN
      RAISE EXCEPTION 'ROLE_UNAVAILABLE' USING ERRCODE = '22023';
    END IF;
    IF NEW.type IS NULL OR NEW.type NOT IN ('STFT','STPT','CSR_NEW') THEN
      RAISE EXCEPTION 'ROLE_CONTRACT_REQUIRED' USING ERRCODE = '22023';
    END IF;
    canonical := CASE target_role.permission_group WHEN 'sm' THEN 'SM' WHEN 'am' THEN 'OFC' ELSE NEW.type END;
    IF role_changed THEN NEW.role := canonical; NEW.job_title := canonical;
    ELSIF NEW.role IS DISTINCT FROM canonical OR NEW.job_title IS DISTINCT FROM canonical THEN
      RAISE EXCEPTION 'ROLE_USE_ASSIGNMENT' USING ERRCODE = '22023';
    END IF;
  ELSIF role_changed THEN
    IF NEW.type IS NULL OR NEW.type NOT IN ('STFT','STPT','CSR_NEW') THEN
      RAISE EXCEPTION 'ROLE_CONTRACT_REQUIRED' USING ERRCODE = '22023';
    END IF;
    NEW.role := NEW.type; NEW.job_title := NEW.type;
  END IF;
  IF role_changed THEN
    INSERT INTO public.admin_logs(actor_id, actor_name, action, target, detail)
    VALUES ('admin','Admin','employee_role_assigned',NEW.id,
      jsonb_build_object('previousRoleId',previous_id,'roleId',NEW.workspace_role_id,'canonicalRole',NEW.role)::text);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS aaa_workspace_employee_role ON public.employees;
CREATE TRIGGER aaa_workspace_employee_role BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_role_assignment();

CREATE OR REPLACE FUNCTION public.assign_workspace_role(p_emp_id text, p_role_id uuid, p_expected jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE employee public.employees; snapshot jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'ROLE_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO employee FROM public.employees WHERE id = p_emp_id FOR UPDATE;
  IF NOT FOUND OR employee.id = 'admin' OR employee.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ROLE_EMPLOYEE_UNAVAILABLE' USING ERRCODE = '22023';
  END IF;
  snapshot := jsonb_build_object('workspaceRoleId',employee.workspace_role_id,'role',employee.role,
    'jobTitle',coalesce(employee.job_title,''),'type',employee.type,'dept',employee.dept);
  IF snapshot IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'ROLE_CONFLICT' USING ERRCODE = '40001';
  END IF;
  UPDATE public.employees SET workspace_role_id = p_role_id WHERE id = p_emp_id RETURNING * INTO employee;
  -- Return only fields needed by the directory; never password/auth fields.
  RETURN jsonb_build_object('id',employee.id,'workspaceRoleId',employee.workspace_role_id,
    'role',employee.role,'jobTitle',coalesce(employee.job_title,''),'type',employee.type,'dept',employee.dept);
END;
$$;
REVOKE ALL ON FUNCTION public.save_workspace_role(text,text,uuid,integer,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_workspace_role(text,uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.guard_workspace_role_assignment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_workspace_role(text,text,uuid,integer,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_workspace_role(text,uuid,jsonb) TO authenticated;
COMMIT;
