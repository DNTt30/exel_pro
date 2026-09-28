-- Compatibility gaps observed on the production schema, 2026-09-28.
-- CREATE TABLE IF NOT EXISTS in the baseline does not add columns to old tables.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS demand jsonb;
ALTER TABLE public.store_shelves ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS expiry_date_2 date;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS emp_name text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS emp_role text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS emp_type text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS resolution_note text;
-- Retain the name used by the currently published frontend during rollout.
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS name text;
UPDATE public.feedbacks SET emp_name=name WHERE emp_name IS NULL AND name IS NOT NULL;
UPDATE public.feedbacks SET name=emp_name WHERE name IS NULL AND emp_name IS NOT NULL;
CREATE OR REPLACE FUNCTION public.sync_feedback_names() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.emp_name:=coalesce(NEW.emp_name,NEW.name,'');
    NEW.name:=NEW.emp_name;
  ELSIF NEW.emp_name IS DISTINCT FROM OLD.emp_name THEN
    NEW.name:=coalesce(NEW.emp_name,'');
  ELSIF NEW.name IS DISTINCT FROM OLD.name THEN
    NEW.emp_name:=NEW.name;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS feedback_names_compat ON public.feedbacks;
CREATE TRIGGER feedback_names_compat BEFORE INSERT OR UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.sync_feedback_names();

-- Live schedule_weeks.week_date is date; clean installations use ISO text.
-- Keep existing types/indexes/data instead of rewriting the table.
CREATE OR REPLACE FUNCTION public.is_week_editable(p_store_id text,p_week_date text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.schedule_weeks
    WHERE store_id=p_store_id AND week_date::text=p_week_date
      AND status NOT IN ('draft','rejected'));
$$;

-- These legacy credential RPCs are used by the app but were absent on clean installs.
CREATE OR REPLACE FUNCTION public.get_credential_state()
RETURNS TABLE(credential_set_at timestamptz,emp_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p.credential_set_at,p.emp_id FROM public.app_profiles p
  WHERE p.id=auth.uid() AND p.emp_id=public.current_emp_id();
$$;
CREATE OR REPLACE FUNCTION public.mark_credential_set() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.app_profiles SET credential_set_at=now()
  WHERE id=auth.uid() AND emp_id=public.current_emp_id();
$$;
REVOKE ALL ON FUNCTION public.get_credential_state(),public.mark_credential_set() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_credential_state(),public.mark_credential_set() TO authenticated;
NOTIFY pgrst, 'reload schema';
