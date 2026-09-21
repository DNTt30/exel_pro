-- ==============================================================================
-- ⚠️ CẢNH BÁO AN NINH (SEC-05) - FILE NÀY MỞ RLS CHO DEV TEST CỤC BỘ ⚠️
-- TUYỆT ĐỐI KHÔNG CHẠY FILE NÀY TRÊN PRODUCTION HOẶC SUPABASE CÔNG KHAI!
-- File này tạo chính sách 'open_all' cho phép anon đọc/sửa mọi bảng.
-- Môi trường thực tế bắt buộc phải dùng:
--   * sql_phase1_security.sql
--   * sql_phase1_security_hardening.sql
-- ==============================================================================

-- ========== 1) Cot & bang moi ==========
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.stores    ADD COLUMN IF NOT EXISTS sm_id text;

CREATE TABLE IF NOT EXISTS public.attendance (
  emp_id       text        NOT NULL,
  work_date    date        NOT NULL,
  actual_hours numeric     NOT NULL DEFAULT 0,
  note         text,
  updated_by   text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (emp_id, work_date)
);

-- ========== 2) Don sach MOI policy cu ==========
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ========== 3) Bat RLS toan bo bang ==========
ALTER TABLE IF EXISTS public.stores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedbacks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_swaps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_shelves     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shelf_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_weeks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_otps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance        ENABLE ROW LEVEL SECURITY;

-- ========== 4) Bang nhay cam: chi he thong (service_role) ====
-- admin_otps: KHONG tao policy nao -> chan tuyet doi
CREATE POLICY auth_all_admin_logs   ON public.admin_logs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_activity     ON public.activity_logs    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_audit        ON public.audit_logs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_all_ai_conv      ON public.ai_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========== 5) Bang nghiep vu: mo cho app chay ngay ==========
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['stores','employees','schedules','feedbacks',
                             'shift_swaps','store_shelves','shelf_items',
                             'schedule_weeks','attendance']
  LOOP
    EXECUTE format('CREATE POLICY open_all_%1$s ON public.%1$I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- ========== 6) Kiem tra: moi dong phai la true ==========
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;