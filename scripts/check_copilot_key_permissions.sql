-- Run inside a transaction after the migration; caller must ROLLBACK.
DO $$
DECLARE test_key text := 'AIza' || repeat('x', 35);
BEGIN
  IF has_function_privilege('anon', 'public.copilot_get_api_key()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.copilot_get_api_key()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.copilot_set_api_key(text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.copilot_set_api_key(text)', 'EXECUTE')
    OR has_schema_privilege('authenticated', 'vault', 'USAGE') THEN
    RAISE EXCEPTION 'Browser roles must not access Copilot credentials';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.copilot_get_api_key()', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.copilot_set_api_key(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Service role cannot access configuration';
  END IF;
  SET LOCAL ROLE service_role;
  PERFORM public.copilot_set_api_key(test_key);
  IF public.copilot_get_api_key() IS DISTINCT FROM test_key THEN
    RAISE EXCEPTION 'Credential round trip failed';
  END IF;
  PERFORM public.copilot_set_api_key(test_key || 'y');
  IF public.copilot_get_api_key() IS DISTINCT FROM test_key || 'y' THEN
    RAISE EXCEPTION 'Credential replacement failed';
  END IF;
  RESET ROLE;
END;
$$;
SELECT 'COPILOT_KEY_PERMISSIONS_OK' AS result;
