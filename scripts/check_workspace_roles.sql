-- LOCAL ONLY: run in an EMPTY disposable PostgreSQL database, never production.
-- Cluster must already have anon/authenticated roles, matching Supabase.
\set ON_ERROR_STOP on
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated;
CREATE TABLE employees(id text PRIMARY KEY,name text,dept text,type text,role text,job_title text,max_h numeric,is_active boolean DEFAULT true);
CREATE TABLE admin_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id text,actor_name text,action text,target text,detail text);
INSERT INTO auth.users VALUES
 ('00000000-0000-0000-0000-000000000001','admin@ofc.app'),
 ('00000000-0000-0000-0000-000000000002','staff@ofc.app'),
 ('00000000-0000-0000-0000-000000000003','sm@ofc.app'),
 ('00000000-0000-0000-0000-000000000004','am@ofc.app');
INSERT INTO employees VALUES ('staff','Staff','A','STPT','STPT','',23,true),('sm','SM','A','STFT','SM','SM',48,true),('am','AM','A','STFT','OFC','OFC',48,true);
-- Same identity checks as catchup; JWT role names are deliberately ignored.
CREATE FUNCTION public.current_emp_id() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT split_part(u.email,'@',1) FROM auth.users u WHERE u.id=auth.uid() AND u.email LIKE '%@ofc.app'
 AND (u.email='admin@ofc.app' OR EXISTS(SELECT 1 FROM employees e WHERE e.id=split_part(u.email,'@',1) AND e.is_active));
$$;
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(public.current_emp_id()='admin',false);
$$;
-- Broad employee update grant intentionally exercises the new trigger beyond RLS.
GRANT SELECT,UPDATE,INSERT ON employees TO authenticated;
\ir ../docs/sql_workspace_roles.sql
\ir ../docs/sql_workspace_roles.sql
SET ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM workspace_roles; RAISE EXCEPTION 'anon read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM save_workspace_role('Bad','staff'); RAISE EXCEPTION 'anon write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
DO $$ DECLARE staff_role uuid; sm_role uuid; am_role uuid; snap jsonb; result jsonb; BEGIN
 staff_role := (save_workspace_role('Quản lý khu vực nhưng quyền nhân viên','staff')->>'id')::uuid;
 sm_role := (save_workspace_role('Trưởng cửa hàng','sm')->>'id')::uuid;
 am_role := (save_workspace_role('Giám sát','am')->>'id')::uuid;
 BEGIN PERFORM save_workspace_role(' giám sát ','am'); RAISE EXCEPTION 'duplicate name allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM save_workspace_role('Invalid','admin'); RAISE EXCEPTION 'custom admin allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE workspace_roles SET name='Direct'; RAISE EXCEPTION 'direct catalog write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 snap := '{"workspaceRoleId":null,"role":"STPT","jobTitle":"","type":"STPT","dept":"A"}';
 result := assign_workspace_role('staff',staff_role,snap);
 IF result->>'role'<>'STPT' OR result->>'jobTitle'<>'STPT' THEN RAISE EXCEPTION 'name grants authority'; END IF;
 IF (SELECT max_h FROM employees WHERE id='staff')<>23 THEN RAISE EXCEPTION 'contract hours changed'; END IF;
 BEGIN PERFORM assign_workspace_role('staff',sm_role,snap); RAISE EXCEPTION 'stale assignment allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 snap := result - 'id';
 result := assign_workspace_role('staff',sm_role,snap);
 IF result->>'role'<>'SM' OR result->>'type'<>'STPT' THEN RAISE EXCEPTION 'SM mapping failed'; END IF;
 PERFORM save_workspace_role('Cửa hàng trưởng mới','sm',sm_role,1,true);
 IF (SELECT role FROM employees WHERE id='staff')<>'SM' THEN RAISE EXCEPTION 'rename changed permission'; END IF;
 BEGIN PERFORM save_workspace_role('Stale','sm',sm_role,1,true); RAISE EXCEPTION 'stale rename allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM save_workspace_role('Changed group','am',sm_role,2,true); RAISE EXCEPTION 'mutable permission group'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM save_workspace_role('Cửa hàng trưởng mới','sm',sm_role,2,false);
 UPDATE employees SET name='Still editable' WHERE id='staff';
 BEGIN UPDATE employees SET workspace_role_id=sm_role WHERE id='sm'; RAISE EXCEPTION 'archived assignment allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 result := assign_workspace_role('staff',am_role,result - 'id');
 IF result->>'role'<>'OFC' OR result->>'type'<>'STPT' THEN RAISE EXCEPTION 'AM mapping failed'; END IF;
 result := assign_workspace_role('staff',NULL,result - 'id');
 IF result->>'role'<>'STPT' OR result->>'jobTitle'<>'STPT' THEN RAISE EXCEPTION 'removal retains authority'; END IF;
 result := assign_workspace_role('staff',staff_role,result - 'id');
 BEGIN UPDATE employees SET job_title='OFC' WHERE id='staff'; RAISE EXCEPTION 'canonical tampering allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SET request.jwt.claim.role='admin';
DO $$ DECLARE actor text; selected uuid; BEGIN
 SELECT id INTO selected FROM workspace_roles WHERE permission_group='am';
 FOREACH actor IN ARRAY ARRAY['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'] LOOP
  PERFORM set_config('request.jwt.claim.sub',actor,false);
  IF (SELECT count(*) FROM workspace_roles)<>3 THEN RAISE EXCEPTION 'authenticated catalog missing'; END IF;
  BEGIN PERFORM save_workspace_role('Forged','staff'); RAISE EXCEPTION 'nonadmin created role'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM assign_workspace_role('staff',selected,'{}'); RAISE EXCEPTION 'nonadmin assigned role'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE employees SET workspace_role_id=selected WHERE id='staff'; RAISE EXCEPTION 'direct escalation allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE employees SET workspace_role_id=NULL WHERE id='staff'; RAISE EXCEPTION 'nonadmin removed assignment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM admin_logs WHERE action='employee_role_assigned')<>5 THEN RAISE EXCEPTION 'audit mismatch'; END IF;
END $$;
SELECT 'WORKSPACE_ROLES_OK' AS result;
