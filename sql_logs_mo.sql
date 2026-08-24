-- ==============================================================================
-- MO NHAT KY: cho phep app GHI + DOC admin_logs & activity_logs khi chay o che
-- do khach (chua fix xong Auth). admin_otps VAN KHOA tuyet doi.
-- Chay 1 lan trong Supabase SQL Editor.
-- ==============================================================================

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('admin_logs','activity_logs','audit_logs','ai_conversations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.tablename, r.schemaname);
  END LOOP;
END $$;

CREATE POLICY open_admin_logs   ON public.admin_logs       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY open_activity     ON public.activity_logs    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY open_audit        ON public.audit_logs       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY open_ai_conv      ON public.ai_conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Kiem tra: 4 dong deu la true
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename IN ('admin_logs','activity_logs','audit_logs','ai_conversations');