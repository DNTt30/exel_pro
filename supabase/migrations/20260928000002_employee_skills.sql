BEGIN;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}'::text[];
-- Employee profile columns remain private; do not restore table-wide SELECT.
GRANT SELECT (skills) ON public.employees TO authenticated;
COMMENT ON COLUMN public.employees.skills IS 'Manager-maintained skill tags. NIGHT_READY certifies night-shift readiness; empty means uncertified.';
NOTIFY pgrst, 'reload schema';
COMMIT;
