-- Production employees uses column-level SELECT grants to protect credentials.
-- New columns do not inherit those grants. Keep existing RLS and write guards.
BEGIN;
GRANT SELECT (workspace_role_id) ON public.employees TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
