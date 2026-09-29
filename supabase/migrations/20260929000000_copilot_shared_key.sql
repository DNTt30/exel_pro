BEGIN;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Only the Edge Function's service role can access the shared credential.
CREATE OR REPLACE FUNCTION public.copilot_get_api_key()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets
  WHERE name = 'ofc_copilot_gemini_api_key' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.copilot_set_api_key(p_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE secret_id uuid;
BEGIN
  IF p_key IS NULL OR p_key !~ '^AIza[0-9A-Za-z_-]{35,}$' OR length(p_key) > 256 THEN
    RAISE EXCEPTION 'Invalid Gemini key format';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(29092026, 1);
  SELECT id INTO secret_id FROM vault.secrets WHERE name = 'ofc_copilot_gemini_api_key';
  IF secret_id IS NULL THEN
    PERFORM vault.create_secret(p_key, 'ofc_copilot_gemini_api_key', 'Shared GS25 Copilot credential');
  ELSE
    PERFORM vault.update_secret(secret_id, p_key);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.copilot_get_api_key() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.copilot_set_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.copilot_get_api_key(), public.copilot_set_api_key(text) TO service_role;
-- Browser roles must not query the Vault directly, even outside PostgREST.
REVOKE ALL ON SCHEMA vault FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA vault FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
