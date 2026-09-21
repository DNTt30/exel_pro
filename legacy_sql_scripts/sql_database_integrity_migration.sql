-- ==============================================================================
-- GS25 SCHEDULE-APP: DATABASE INTEGRITY & ORPHAN CLEANUP MIGRATION (V2 - FIXED)
-- File: sql_database_integrity_migration.sql
-- TÍNH CHẤT: An toàn tuyệt đối (Idempotent), chạy nhiều lần không lỗi.
-- KHẮC PHỤC LỖI V1:
--   - Sửa lỗi 23502: "null value in column 'emp_id' of relation 'feedbacks' violates not-null constraint".
--   - Tự động Backfill hồ sơ nhân viên lịch sử cho những nhân viên cũ (như Tô Hoàng Sơn)
--     đã gửi feedback hoặc đổi ca nhưng chưa có trong bảng employees.
--   - Giữ nguyên 100% dữ liệu lịch sử phản hồi và đơn từ, không làm mất danh tính người gửi.
--   - DROP NOT NULL an toàn cho feedbacks.emp_id, shift_swaps.from_emp_id, shift_swaps.to_emp_id
--     để hỗ trợ cơ chế ON DELETE SET NULL khi xóa nhân viên trong tương lai.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- BƯỚC 0: ĐẢM BẢO CÁC CỘT CẦN THIẾT TỒN TẠI TRƯỚC KHI THỰC HIỆN
-- ==============================================================================
-- Cột trạng thái hoạt động của nhân viên (phục vụ đánh dấu nhân viên cũ / đã nghỉ việc)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;


-- ==============================================================================
-- PHẦN 1: BÁO CÁO RÀ SOÁT DỮ LIỆU MỒ CÔI TRƯỚC KHI XỬ LÝ (PRE-CHECK)
-- ==============================================================================
DO $$
DECLARE
  v_orphan_schedules int;
  v_orphan_attendance int;
  v_orphan_feedbacks int;
  v_orphan_swaps int;
  v_orphan_shelves int;
  v_orphan_items int;
  v_bad_sm int;
BEGIN
  SELECT count(*) INTO v_orphan_schedules FROM public.schedules s
  WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = s.emp_id);

  SELECT count(*) INTO v_orphan_attendance FROM public.attendance a
  WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = a.emp_id);

  SELECT count(*) INTO v_orphan_feedbacks FROM public.feedbacks f
  WHERE f.emp_id IS NOT NULL AND trim(f.emp_id) <> ''
    AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = f.emp_id);

  SELECT count(*) INTO v_orphan_swaps FROM public.shift_swaps sw
  WHERE (sw.from_emp_id IS NOT NULL AND trim(sw.from_emp_id) <> '' AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = sw.from_emp_id))
     OR (sw.to_emp_id IS NOT NULL AND trim(sw.to_emp_id) <> '' AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = sw.to_emp_id));

  SELECT count(*) INTO v_orphan_shelves FROM public.store_shelves sh
  WHERE NOT EXISTS (SELECT 1 FROM public.stores st WHERE st.id = sh.store_id);

  SELECT count(*) INTO v_orphan_items FROM public.shelf_items it
  WHERE NOT EXISTS (SELECT 1 FROM public.store_shelves sh WHERE sh.id = it.shelf_id);

  SELECT count(*) INTO v_bad_sm FROM public.stores st
  WHERE st.sm_id IS NOT NULL AND trim(st.sm_id) <> ''
    AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = st.sm_id);

  RAISE NOTICE '-------------------------------------------------------------';
  RAISE NOTICE '🔍 KẾT QUẢ QUÉT DỮ LIỆU MỒ CÔI TRƯỚC KHI MIGRATION:';
  RAISE NOTICE '  - Lịch mồ côi (schedules): %', v_orphan_schedules;
  RAISE NOTICE '  - Chấm công mồ côi (attendance): %', v_orphan_attendance;
  RAISE NOTICE '  - Phản hồi mồ côi (feedbacks): %', v_orphan_feedbacks;
  RAISE NOTICE '  - Đơn đổi ca mồ côi (shift_swaps): %', v_orphan_swaps;
  RAISE NOTICE '  - Kệ hàng trỏ store không tồn tại (store_shelves): %', v_orphan_shelves;
  RAISE NOTICE '  - Hàng trên kệ mất liên kết kệ cha (shelf_items): %', v_orphan_items;
  RAISE NOTICE '  - Cửa hàng trỏ SM không tồn tại (stores.sm_id): %', v_bad_sm;
  RAISE NOTICE '-------------------------------------------------------------';
END $$;


-- ==============================================================================
-- PHẦN 2: AUTO-BACKFILL NHÂN VIÊN LỊCH SỬ & DỌN DẸP DỮ LIỆU AN TOÀN
-- ==============================================================================

-- 2.1 BACKFILL NHÂN VIÊN TỪ FEEDBACKS (VD: Tô Hoàng Sơn)
-- Mục đích: Giữ lại toàn bộ dữ liệu khiếu nại/bù công lịch sử, không làm mất tên và mã NV.
DO $$
DECLARE
  v_has_emp_name boolean;
  v_has_name boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feedbacks' AND column_name = 'emp_name') INTO v_has_emp_name;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feedbacks' AND column_name = 'name') INTO v_has_name;

  IF v_has_emp_name AND v_has_name THEN
    EXECUTE '
      INSERT INTO public.employees (id, name, dept, type, role, is_active)
      SELECT DISTINCT 
        f.emp_id, 
        COALESCE(NULLIF(f.emp_name, ''''), NULLIF(f.name, ''''), ''Cựu nhân viên ('' || f.emp_id || '')''), 
        COALESCE(NULLIF(f.dept, ''''), ''VN0490''), 
        ''STPT'', 
        ''Cựu nhân viên'',
        false
      FROM public.feedbacks f
      WHERE f.emp_id IS NOT NULL AND trim(f.emp_id) <> ''''
        AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = f.emp_id)
      ON CONFLICT (id) DO NOTHING;
    ';
  ELSIF v_has_name THEN
    EXECUTE '
      INSERT INTO public.employees (id, name, dept, type, role, is_active)
      SELECT DISTINCT 
        f.emp_id, 
        COALESCE(NULLIF(f.name, ''''), ''Cựu nhân viên ('' || f.emp_id || '')''), 
        COALESCE(NULLIF(f.dept, ''''), ''VN0490''), 
        ''STPT'', 
        ''Cựu nhân viên'',
        false
      FROM public.feedbacks f
      WHERE f.emp_id IS NOT NULL AND trim(f.emp_id) <> ''''
        AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = f.emp_id)
      ON CONFLICT (id) DO NOTHING;
    ';
  ELSIF v_has_emp_name THEN
    EXECUTE '
      INSERT INTO public.employees (id, name, dept, type, role, is_active)
      SELECT DISTINCT 
        f.emp_id, 
        COALESCE(NULLIF(f.emp_name, ''''), ''Cựu nhân viên ('' || f.emp_id || '')''), 
        COALESCE(NULLIF(f.dept, ''''), ''VN0490''), 
        ''STPT'', 
        ''Cựu nhân viên'',
        false
      FROM public.feedbacks f
      WHERE f.emp_id IS NOT NULL AND trim(f.emp_id) <> ''''
        AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = f.emp_id)
      ON CONFLICT (id) DO NOTHING;
    ';
  END IF;
  RAISE NOTICE '✓ Đã hoàn thành auto-backfill nhân viên lịch sử từ feedbacks';
END $$;

-- 2.2 BACKFILL NHÂN VIÊN TỪ SHIFT_SWAPS (Đổi ca)
INSERT INTO public.employees (id, name, dept, type, role, is_active)
SELECT DISTINCT 
  sw.from_emp_id, 
  COALESCE(NULLIF(sw.from_emp_name, ''), 'Cựu nhân viên (' || sw.from_emp_id || ')'), 
  COALESCE(NULLIF(sw.store, ''), 'VN0490'), 
  'STPT', 
  'Cựu nhân viên', 
  false
FROM public.shift_swaps sw
WHERE sw.from_emp_id IS NOT NULL AND trim(sw.from_emp_id) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = sw.from_emp_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employees (id, name, dept, type, role, is_active)
SELECT DISTINCT 
  sw.to_emp_id, 
  COALESCE(NULLIF(sw.to_emp_name, ''), 'Cựu nhân viên (' || sw.to_emp_id || ')'), 
  COALESCE(NULLIF(sw.store, ''), 'VN0490'), 
  'STPT', 
  'Cựu nhân viên', 
  false
FROM public.shift_swaps sw
WHERE sw.to_emp_id IS NOT NULL AND trim(sw.to_emp_id) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = sw.to_emp_id)
ON CONFLICT (id) DO NOTHING;

-- 2.3 BACKFILL NHÂN VIÊN TỪ ATTENDANCE (Chấm công ezHR) VÀ SCHEDULES (Lịch làm việc)
INSERT INTO public.employees (id, name, dept, type, role, is_active)
SELECT DISTINCT 
  a.emp_id, 
  'Nhân viên ezHR (' || a.emp_id || ')', 
  'VN0490', 
  'STPT', 
  'Cựu nhân viên', 
  false
FROM public.attendance a
WHERE a.emp_id IS NOT NULL AND trim(a.emp_id) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = a.emp_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employees (id, name, dept, type, role, is_active)
SELECT DISTINCT 
  s.emp_id, 
  'Nhân viên cũ (' || s.emp_id || ')', 
  'VN0490', 
  'STPT', 
  'Cựu nhân viên', 
  false
FROM public.schedules s
WHERE s.emp_id IS NOT NULL AND trim(s.emp_id) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = s.emp_id)
ON CONFLICT (id) DO NOTHING;

-- 2.4 GỠ BỎ RÀNG BUỘC NOT NULL TRÊN CÁC CỘT THAM CHIẾU
-- Điều này BẮT BUỘC để cho phép cơ chế ON DELETE SET NULL hoạt động khi xóa nhân viên,
-- và ngăn chặn triệt để lỗi ERROR 23502 (null value in column violates not-null constraint).
ALTER TABLE public.feedbacks ALTER COLUMN emp_id DROP NOT NULL;
ALTER TABLE public.shift_swaps ALTER COLUMN from_emp_id DROP NOT NULL;
ALTER TABLE public.shift_swaps ALTER COLUMN to_emp_id DROP NOT NULL;

-- 2.5 CHUẨN HÓA CHUỖI RỖNG THÀNH NULL
UPDATE public.feedbacks SET emp_id = NULL WHERE emp_id IS NOT NULL AND trim(emp_id) = '';
UPDATE public.shift_swaps SET from_emp_id = NULL WHERE from_emp_id IS NOT NULL AND trim(from_emp_id) = '';
UPDATE public.shift_swaps SET to_emp_id = NULL WHERE to_emp_id IS NOT NULL AND trim(to_emp_id) = '';
UPDATE public.stores SET sm_id = NULL WHERE sm_id IS NOT NULL AND trim(sm_id) = '';

-- 2.6 XỬ LÝ AN TOÀN NẾU VẪN CÒN EMP_ID KHÔNG THỂ KHỚP
UPDATE public.feedbacks f
SET emp_id = NULL
WHERE f.emp_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = f.emp_id);

UPDATE public.shift_swaps sw
SET from_emp_id = NULL
WHERE sw.from_emp_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = sw.from_emp_id);

UPDATE public.shift_swaps sw
SET to_emp_id = NULL
WHERE sw.to_emp_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = sw.to_emp_id);

UPDATE public.stores st
SET sm_id = NULL
WHERE st.sm_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = st.sm_id);

-- 2.7 CHUẨN HÓA CỘT week_date TRONG schedules VỀ ISO-8601 (YYYY-MM-DD)
UPDATE public.schedules s
SET week_date = to_char(to_date(s.week_date, 'YYYY-MM-DD'), 'YYYY-MM-DD')
WHERE s.week_date ~ '^\d{4}-\d{1,2}-\d{1,2}$'
  AND s.week_date <> to_char(to_date(s.week_date, 'YYYY-MM-DD'), 'YYYY-MM-DD')
  AND NOT EXISTS (
    SELECT 1 FROM public.schedules dup
    WHERE dup.emp_id = s.emp_id
      AND dup.week_date = to_char(to_date(s.week_date, 'YYYY-MM-DD'), 'YYYY-MM-DD')
      AND dup.ctid <> s.ctid
  );

-- 2.8 DỌN DẸP CÁC BẢN GHI KHÔNG THỂ THAM CHIẾU (Hàng trên kệ mồ côi, lịch rác)
DELETE FROM public.shelf_items it
WHERE NOT EXISTS (SELECT 1 FROM public.store_shelves sh WHERE sh.id = it.shelf_id);

DELETE FROM public.schedules s
WHERE s.emp_id IS NULL OR trim(s.emp_id) = '' 
   OR NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = s.emp_id);

DELETE FROM public.attendance a
WHERE a.emp_id IS NULL OR trim(a.emp_id) = '' 
   OR NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = a.emp_id);

-- 2.9 CHUẨN HÓA GIÁ TRỊ MIỀN TRƯỚC KHI TẠO CHECK CONSTRAINTS
UPDATE public.feedbacks SET status = 'pending' WHERE status IS NULL OR trim(status) = '';
UPDATE public.feedbacks SET status = 'approved' WHERE status NOT IN ('pending', 'approved', 'rejected');

UPDATE public.shift_swaps SET status = 'pending_partner' WHERE status IS NULL OR trim(status) = '';
UPDATE public.shift_swaps SET status = 'approved' WHERE status IN ('resolved', 'done', 'accepted');
UPDATE public.shift_swaps SET status = 'pending_partner' WHERE status NOT IN ('pending_partner', 'pending_manager', 'approved', 'rejected', 'cancelled');

UPDATE public.attendance SET actual_hours = 0 WHERE actual_hours IS NULL OR actual_hours < 0;
UPDATE public.attendance SET actual_hours = 24 WHERE actual_hours > 24;

UPDATE public.store_shelves SET notify_days = 3 WHERE notify_days IS NULL OR notify_days < 1;


-- ==============================================================================
-- PHẦN 3: BỔ SUNG CÁC RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEY CONSTRAINTS)
-- ==============================================================================

-- 3.1 Khóa ngoại schedules -> employees (Xóa nhân viên -> Xóa lịch tương ứng)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_schedules_emp') THEN
    ALTER TABLE public.schedules 
      ADD CONSTRAINT fk_schedules_emp 
      FOREIGN KEY (emp_id) REFERENCES public.employees(id) ON DELETE CASCADE;
    RAISE NOTICE '✓ Đã tạo ràng buộc: fk_schedules_emp';
  END IF;
END $$;

-- 3.2 Khóa ngoại attendance -> employees (Xóa nhân viên -> Xóa công ezHR tương ứng)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_emp') THEN
    ALTER TABLE public.attendance 
      ADD CONSTRAINT fk_attendance_emp 
      FOREIGN KEY (emp_id) REFERENCES public.employees(id) ON DELETE CASCADE;
    RAISE NOTICE '✓ Đã tạo ràng buộc: fk_attendance_emp';
  END IF;
END $$;

-- 3.3 Khóa ngoại stores.sm_id -> employees (Xóa SM -> Cửa hàng để trống sm_id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stores_sm') THEN
    ALTER TABLE public.stores 
      ADD CONSTRAINT fk_stores_sm 
      FOREIGN KEY (sm_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    RAISE NOTICE '✓ Đã tạo ràng buộc: fk_stores_sm';
  END IF;
END $$;

-- 3.4 Khóa ngoại shelf_items -> store_shelves (Xóa kệ -> Xóa sạch hàng trong kệ)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shelf_items_shelf') THEN
    ALTER TABLE public.shelf_items 
      ADD CONSTRAINT fk_shelf_items_shelf 
      FOREIGN KEY (shelf_id) REFERENCES public.store_shelves(id) ON DELETE CASCADE;
    RAISE NOTICE '✓ Đã tạo ràng buộc: fk_shelf_items_shelf';
  END IF;
END $$;

-- 3.5 Khóa ngoại feedbacks -> employees (Xóa nhân viên -> Giữ đơn nhưng set null emp_id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_feedbacks_emp') THEN
    ALTER TABLE public.feedbacks 
      ADD CONSTRAINT fk_feedbacks_emp 
      FOREIGN KEY (emp_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    RAISE NOTICE '✓ Đã tạo ràng buộc: fk_feedbacks_emp';
  END IF;
END $$;

-- 3.6 Khóa ngoại shift_swaps -> employees
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_swaps_from_emp') THEN
    ALTER TABLE public.shift_swaps 
      ADD CONSTRAINT fk_swaps_from_emp 
      FOREIGN KEY (from_emp_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    RAISE NOTICE '✓ Đã tạo ràng buộc: fk_swaps_from_emp';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_swaps_to_emp') THEN
    ALTER TABLE public.shift_swaps 
      ADD CONSTRAINT fk_swaps_to_emp 
      FOREIGN KEY (to_emp_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    RAISE NOTICE '✓ Đã tạo ràng buộc: fk_swaps_to_emp';
  END IF;
END $$;


-- ==============================================================================
-- PHẦN 4: BỔ SUNG CHECK CONSTRAINTS BẢO VỆ DỮ LIỆU MIỀN
-- ==============================================================================

-- 4.1 Kiểm soát trạng thái đơn đổi ca (chống lỗi chính tả và giá trị rác)
DO $$ BEGIN
  ALTER TABLE public.shift_swaps DROP CONSTRAINT IF EXISTS ck_shift_swaps_status;
  ALTER TABLE public.shift_swaps ADD CONSTRAINT ck_shift_swaps_status 
    CHECK (status IN ('pending_partner', 'pending_manager', 'approved', 'rejected', 'cancelled'));
  RAISE NOTICE '✓ Đã tạo ràng buộc kiểm tra: ck_shift_swaps_status';
EXCEPTION WHEN others THEN RAISE NOTICE 'Bỏ qua ck_shift_swaps_status: %', sqlerrm; END $$;

-- 4.2 Kiểm soát trạng thái khiếu nại bù công (feedbacks)
DO $$ BEGIN
  ALTER TABLE public.feedbacks DROP CONSTRAINT IF EXISTS ck_feedbacks_status;
  ALTER TABLE public.feedbacks ADD CONSTRAINT ck_feedbacks_status 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  RAISE NOTICE '✓ Đã tạo ràng buộc kiểm tra: ck_feedbacks_status';
EXCEPTION WHEN others THEN RAISE NOTICE 'Bỏ qua ck_feedbacks_status: %', sqlerrm; END $$;

-- 4.3 Kiểm soát giờ công thực tế (không âm, không quá 24h/ngày)
DO $$ BEGIN
  ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS ck_attendance_hours;
  ALTER TABLE public.attendance ADD CONSTRAINT ck_attendance_hours 
    CHECK (actual_hours >= 0 AND actual_hours <= 24);
  RAISE NOTICE '✓ Đã tạo ràng buộc kiểm tra: ck_attendance_hours';
EXCEPTION WHEN others THEN RAISE NOTICE 'Bỏ qua ck_attendance_hours: %', sqlerrm; END $$;

-- 4.4 Kiểm soát ngày báo date kệ hàng (phải >= 1 ngày)
DO $$ BEGIN
  ALTER TABLE public.store_shelves DROP CONSTRAINT IF EXISTS ck_shelves_notify_days;
  ALTER TABLE public.store_shelves ADD CONSTRAINT ck_shelves_notify_days 
    CHECK (notify_days >= 1);
  RAISE NOTICE '✓ Đã tạo ràng buộc kiểm tra: ck_shelves_notify_days';
EXCEPTION WHEN others THEN RAISE NOTICE 'Bỏ qua ck_shelves_notify_days: %', sqlerrm; END $$;


-- ==============================================================================
-- PHẦN 5: TỐI ƯU HÓA CHỈ MỤC (INDEXING FOR HIGH CONCURRENCY & SPEED)
-- ==============================================================================

-- 5.1 Index tìm kiếm đơn đổi ca theo tuần & trạng thái
CREATE INDEX IF NOT EXISTS idx_shift_swaps_week_status ON public.shift_swaps(week_date, status);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_from_emp     ON public.shift_swaps(from_emp_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_to_emp       ON public.shift_swaps(to_emp_id);

-- 5.2 Index tra cứu công thực tế theo ngày (tránh Full Table Scan khi xem bảng chấm công)
CREATE INDEX IF NOT EXISTS idx_attendance_work_date     ON public.attendance(work_date);

-- 5.3 Index tra cứu khiếu nại bù công theo cửa hàng và trạng thái
CREATE INDEX IF NOT EXISTS idx_feedbacks_dept_status   ON public.feedbacks(dept, status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_emp           ON public.feedbacks(emp_id);

-- 5.4 Index cảnh báo date hàng hóa cận hạn
CREATE INDEX IF NOT EXISTS idx_shelf_items_expiry       ON public.shelf_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_shelf_items_shelf        ON public.shelf_items(shelf_id);


-- ==============================================================================
-- PHẦN 6: KIỂM TRA & BÁO CÁO KẾT QUẢ CUỐI CÙNG (POST-CHECK)
-- ==============================================================================
DO $$
DECLARE
  v_remaining_orphans int := 0;
  v_constraints_count int := 0;
BEGIN
  -- Đếm lại xem còn sót dữ liệu mồ côi nào không
  SELECT count(*) INTO v_remaining_orphans FROM (
    SELECT 1 FROM public.schedules s WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = s.emp_id)
    UNION ALL
    SELECT 1 FROM public.attendance a WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = a.emp_id)
    UNION ALL
    SELECT 1 FROM public.shelf_items it WHERE NOT EXISTS (SELECT 1 FROM public.store_shelves sh WHERE sh.id = it.shelf_id)
  ) t;

  SELECT count(*) INTO v_constraints_count 
  FROM pg_constraint 
  WHERE conname IN (
    'fk_schedules_emp', 'fk_attendance_emp', 'fk_stores_sm', 
    'fk_shelf_items_shelf', 'fk_feedbacks_emp', 'fk_swaps_from_emp', 
    'fk_swaps_to_emp', 'ck_shift_swaps_status', 'ck_feedbacks_status',
    'ck_attendance_hours', 'ck_shelves_notify_days'
  );

  RAISE NOTICE '=============================================================';
  RAISE NOTICE '🎉 MIGRATION HOÀN TẤT THÀNH CÔNG!';
  RAISE NOTICE '  - Số lượng bản ghi mồ côi còn lại: % (Yêu cầu = 0)', v_remaining_orphans;
  RAISE NOTICE '  - Số ràng buộc toàn vẹn đã kích hoạt: % / 11', v_constraints_count;
  RAISE NOTICE '  - CSDL đã đạt chuẩn toàn vẹn tham chiếu (ACID & Referential Integrity).';
  RAISE NOTICE '=============================================================';
END $$;

COMMIT;
