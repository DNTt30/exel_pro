-- Also runnable independently after deployment; checks metadata only, no employee PII.
DO $$
DECLARE signature text; table_name text; missing_columns text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.login_lookup_v2(text)', 'public.can_manage_store(text)',
    'public.ensure_app_profile_v2()', 'public.employee_is_manager(text,text,text)',
    'public.save_employee_schedule(text,text,jsonb,integer)',
    'public.upsert_schedules_bulk(jsonb)', 'public.approve_shift_swap_atomic_v2(uuid,text)',
    'public.resolve_feedback_atomic_v2(uuid,text,text,jsonb)',
    'public.replace_shelf_items_atomic(uuid,text,jsonb,text)',
    'public.get_credential_state()', 'public.mark_my_password_changed()',
    'public.issue_password_reset_otp(text,text)', 'public.claim_password_reset_otp(text,text)',
    'public.finish_password_reset_otp(uuid,boolean)'
  ] LOOP
    IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'MISSING_RPC: %',signature; END IF;
  END LOOP;
  IF to_regprocedure('public.save_employee_schedule(text,text,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'OBSOLETE_SCHEDULE_OVERLOAD';
  END IF;
  FOREACH table_name IN ARRAY ARRAY['employees','schedules','schedule_weeks','feedbacks',
    'store_shelves','shelf_items','password_reset_otps','password_reset_otp_requests'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.'||table_name)) THEN
      RAISE EXCEPTION 'RLS_DISABLED: %',table_name;
    END IF;
  END LOOP;
  IF has_table_privilege('anon','public.password_reset_otps','SELECT')
    OR has_table_privilege('authenticated','public.password_reset_otps','SELECT')
    OR has_function_privilege('anon','public.claim_password_reset_otp(text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.issue_password_reset_otp(text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'OTP_PRIVILEGES_TOO_BROAD';
  END IF;
  IF NOT has_function_privilege('anon','public.login_lookup_v2(text)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.save_employee_schedule(text,text,jsonb,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'MISSING_CLIENT_RPC_GRANT';
  END IF;
  SELECT string_agg(required.tbl||'.'||required.col,', ') INTO missing_columns
  FROM (VALUES ('stores','is_active'),('stores','demand'),('store_shelves','due_date'),
    ('shelf_items','sku'),('shelf_items','expiry_date_2'),('feedbacks','emp_name'),
    ('feedbacks','emp_role'),('feedbacks','emp_type'),('feedbacks','note'),
    ('feedbacks','image_url'),('feedbacks','resolution_note'),('employees','recovery_email')) required(tbl,col)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=required.tbl AND c.column_name=required.col);
  IF missing_columns IS NOT NULL THEN RAISE EXCEPTION 'MISSING_COLUMNS: %',missing_columns; END IF;
END $$;
SELECT 'DATABASE_CHECKS_OK' AS result;
