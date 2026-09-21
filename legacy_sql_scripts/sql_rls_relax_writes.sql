-- ==============================================================================
-- PHUONG AN B (chay khi van chua khac phuc duoc loi tao user Auth):
-- Cho phep anon GHI/DOC cac bang nghiep vu de app hoat dong tro lai ngay.
-- Van GIU KHOA doc: admin_otps (tuyet doi) va 4 bang log (chi authenticated).
--
-- Danh doi: ai co anon key deu sua duoc du lieu nghiep vu - chi dung TAM THOI.
-- Khac phuc xong Auth thi chay lai sql_rls_authenticated.sql de khoa tro lai.
-- ==============================================================================

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['stores','employees','schedules','feedbacks',
                             'shift_swaps','store_shelves','shelf_items','schedule_weeks']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_all_%1$s ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS anon_read_%1$s ON public.%1$I', tbl);
    EXECUTE format('CREATE POLICY open_all_%1$s ON public.%1$I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- Dọn các policy tên đặc biệt từ bản v2
DROP POLICY IF EXISTS auth_all_swaps       ON public.shift_swaps;
DROP POLICY IF EXISTS auth_all_weeks       ON public.schedule_weeks;
DROP POLICY IF EXISTS auth_all_shelves     ON public.store_shelves;
DROP POLICY IF EXISTS auth_all_shelf_items ON public.shelf_items;

-- Kiem tra nhanh
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;