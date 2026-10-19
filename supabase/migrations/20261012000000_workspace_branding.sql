-- One deployment = one organization. Public identity ONLY, never secrets/policies.
-- Prerequisite: database catchup migration (public.is_admin, admin_logs).
BEGIN;
CREATE TABLE IF NOT EXISTS public.workspace_branding (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name text NOT NULL DEFAULT 'Lịch Ca' CHECK (length(app_name) BETWEEN 2 AND 40 AND app_name !~ '[[:cntrl:]<>]'),
  organization_name text NOT NULL DEFAULT '' CHECK (length(organization_name) <= 100 AND organization_name !~ '[[:cntrl:]<>]'),
  primary_color text NOT NULL DEFAULT '#4338ca' CHECK (primary_color IN ('#4338ca','#1d4ed8','#047857','#be123c','#92400e')),
  contact_email text NOT NULL DEFAULT '' CHECK (length(contact_email) <= 254 AND (contact_email = '' OR contact_email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')),
  logo_data_url text NOT NULL DEFAULT '' CHECK (length(logo_data_url) <= 180000 AND (logo_data_url = '' OR logo_data_url ~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.workspace_branding(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.workspace_branding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_branding FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.workspace_branding TO anon, authenticated;
DROP POLICY IF EXISTS workspace_branding_read ON public.workspace_branding;
CREATE POLICY workspace_branding_read ON public.workspace_branding FOR SELECT TO anon, authenticated USING (id = 1);

CREATE OR REPLACE FUNCTION public.save_workspace_branding(
  p_app_name text, p_organization_name text, p_primary_color text,
  p_contact_email text, p_logo_data_url text, p_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE saved public.workspace_branding; current_revision integer;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'BRANDING_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  SELECT revision INTO current_revision FROM public.workspace_branding WHERE id = 1 FOR UPDATE;
  IF current_revision IS NULL OR p_revision IS DISTINCT FROM current_revision THEN
    RAISE EXCEPTION 'BRANDING_CONFLICT' USING ERRCODE = '40001';
  END IF;
  UPDATE public.workspace_branding SET
    app_name = btrim(p_app_name), organization_name = btrim(p_organization_name),
    primary_color = p_primary_color, contact_email = btrim(p_contact_email),
    logo_data_url = p_logo_data_url, revision = revision + 1, updated_at = now()
  WHERE id = 1 RETURNING * INTO saved;
  INSERT INTO public.admin_logs(actor_id, actor_name, action, target, detail)
  VALUES ('admin', 'Admin', 'workspace_branding_updated', 'workspace',
    jsonb_build_object('revision', saved.revision, 'appName', saved.app_name,
      'primaryColor', saved.primary_color, 'hasLogo', saved.logo_data_url <> '')::text);
  RETURN to_jsonb(saved);
END;
$$;
REVOKE ALL ON FUNCTION public.save_workspace_branding(text,text,text,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_workspace_branding(text,text,text,text,text,integer) TO authenticated;
COMMIT;
