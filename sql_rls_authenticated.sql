-- ==============================================================================
-- OFC v2: KHOA RLS TOAN BO BANG (ban sau audit)
--
-- Ket qua audit anon-key: TAT CA cac bang deu DOC DUOC boi an danh,
-- ke ca feedbacks, shift_swaps, log bao mat va admin_otps.
--
-- Phan quyen moi:
--   * anon          : chi SELECT stores / employees / schedules (man hinh login)
--   * authenticated : toan quyen CRUD (dang nhap app la co phien)
--   * admin_otps    : khong policy nao - chi service_role (Edge Function)
--
-- SAU KHI CHAY: moi nguoi dang nhap lai app mot lan de nhan phien Auth
-- ({maNV}@ofc.app). Nguoi chua co phien van xem duoc lich nhung feedback/
-- doi ca/ke se trong cho den khi dang nhap lai thanh cong.
-- ==============================================================================

-- 0) admin_otps: khoa tuyet doi
ALTER TABLE IF EXISTS public.admin_otps ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p text; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_otps'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_otps', p); END LOOP;
END $$;

-- 1) Bat RLS moi bang
ALTER TABLE IF EXISTS public.stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedbacks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_swaps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_shelves    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shelf_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_weeks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- 2) Don sach policy cu tren toan bo schema public
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
           WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 3) authenticated: toan quyen
CREATE POLICY auth_all_stores        ON public.stores           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_employees     ON public.employees        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_schedules     ON public.schedules        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_feedbacks     ON public.feedbacks        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_swaps         ON public.shift_swaps      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_shelves       ON public.store_shelves    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_shelf_items   ON public.shelf_items      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_weeks         ON public.schedule_weeks   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_admin_logs    ON public.admin_logs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_activity      ON public.activity_logs    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_audit         ON public.audit_logs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_ai_conv       ON public.ai_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) anon: chi doc 3 bang can tra ma NV khi dang nhap
CREATE POLICY anon_read_stores    ON public.stores    FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_employees ON public.employees FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_schedules ON public.schedules FOR SELECT TO anon USING (true);

-- 5) Kiem tra: tat ca dong phai la true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;