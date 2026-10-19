-- Read-only production smoke check. Never creates users, approves documents,
-- or prints employee identifiers, messages, passwords or tokens.
BEGIN READ ONLY;
DO $$ DECLARE identity uuid; BEGIN
  SELECT id INTO identity FROM auth.users WHERE email='admin@ofc.app';
  IF identity IS NULL THEN RAISE EXCEPTION 'ADMIN_FIXTURE_UNAVAILABLE'; END IF;
  PERFORM set_config('request.jwt.claim.sub',identity::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'ADMIN_IDENTITY_FAILED'; END IF;
  IF (SELECT count(*) FROM public.handbook_catalog_imports)<>98 THEN RAISE EXCEPTION 'CATALOG_INCOMPLETE'; END IF;
  IF EXISTS(SELECT 1 FROM public.handbook_changes WHERE submitted_by='catalog-import' AND status='pending' AND confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'IMPORT_CONFIRMATION_FORGED';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.handbook_changes WHERE submitted_by='catalog-import') THEN RAISE EXCEPTION 'ADMIN_CANNOT_READ_IMPORTS'; END IF;
END $$;
RESET ROLE;
DO $$ DECLARE identity uuid; BEGIN
  SELECT u.id INTO identity FROM auth.users u JOIN public.employees e ON u.email=e.id||'@ofc.app'
    WHERE e.is_active AND upper(e.type) IN ('STPT','STFT') AND upper(coalesce(e.role,'')) IN ('STPT','STFT','EMPLOYEE','')
    ORDER BY e.id LIMIT 1;
  IF identity IS NULL THEN RAISE EXCEPTION 'STAFF_FIXTURE_UNAVAILABLE'; END IF;
  PERFORM set_config('request.jwt.claim.sub',identity::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE store text; config jsonb; BEGIN
  IF public.current_emp_id() IS NULL OR public.is_admin() OR public.has_role('STORE_MANAGER') OR public.has_role('AREA_MANAGER') THEN
    RAISE EXCEPTION 'STAFF_IDENTITY_FAILED';
  END IF;
  IF EXISTS(SELECT 1 FROM public.handbook_entries WHERE published_at IS NULL OR NOT is_active)
    OR EXISTS(SELECT 1 FROM public.handbook_changes) OR EXISTS(SELECT 1 FROM public.handbook_catalog_imports) THEN
    RAISE EXCEPTION 'STAFF_DRAFT_LEAK';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_handbook_knowledge()) e
      WHERE (e->>'is_active')::boolean AND nullif(e->>'published_at','') IS NULL) THEN
    RAISE EXCEPTION 'KNOWLEDGE_DRAFT_LEAK';
  END IF;
  SELECT s INTO store FROM public.my_member_stores() s LIMIT 1;
  IF store IS NULL THEN RAISE EXCEPTION 'STAFF_STORE_UNAVAILABLE'; END IF;
  config:=public.get_registration_deadline(store,to_char(date_trunc('week',now()),'YYYY-MM-DD'));
  IF config->'config' IS NULL OR config->>'serverNow' IS NULL THEN RAISE EXCEPTION 'DEADLINE_UNAVAILABLE'; END IF;
  IF EXISTS(SELECT 1 FROM public.notification_receipts WHERE emp_id<>public.current_emp_id()) THEN RAISE EXCEPTION 'RECEIPTS_LEAK'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF has_table_privilege('anon','public.handbook_entries','SELECT')
    OR has_function_privilege('anon','public.get_handbook_knowledge()','EXECUTE') THEN
    RAISE EXCEPTION 'ANONYMOUS_HANDBOOK_ACCESS';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='handbook-images' AND NOT public AND file_size_limit=5242880) THEN
    RAISE EXCEPTION 'PRIVATE_BUCKET_MISSING';
  END IF;
END $$;
SELECT 'HANDBOOK_RELEASE_READONLY_OK' AS result;
ROLLBACK;
