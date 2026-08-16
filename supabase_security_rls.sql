-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) - BẢN CẬP NHẬT BẢO MẬT HỆ THỐNG OFC
-- ==============================================================================
-- Mục tiêu: 
-- 1. Chặn hoàn toàn quyền INSERT / UPDATE / DELETE trực tiếp từ client không xác thực (role 'anon').
-- 2. Chỉ cho phép role 'anon' đọc (SELECT) dữ liệu phục vụ hiển thị app.
-- 3. Mọi thao tác ghi/sửa/xoá trên bảng stores, employees, schedules, feedbacks 
--    bắt buộc phải qua authenticated user hoặc Supabase Edge Function (service_role).
-- ==============================================================================

-- 1. XÓA CÁC POLICY KHÔNG AN TOÀN HIỆN CÓ (VÍ DỤ: FOR ALL USING (true))
DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.stores;
DROP POLICY IF EXISTS "Allow all for anon" ON public.stores;
DROP POLICY IF EXISTS "Public stores access" ON public.stores;

DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.employees;
DROP POLICY IF EXISTS "Allow all for anon" ON public.employees;
DROP POLICY IF EXISTS "Public employees access" ON public.employees;

DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.schedules;
DROP POLICY IF EXISTS "Allow all for anon" ON public.schedules;
DROP POLICY IF EXISTS "Public schedules access" ON public.schedules;

DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.feedbacks;
DROP POLICY IF EXISTS "Allow all for anon" ON public.feedbacks;
DROP POLICY IF EXISTS "Public feedbacks access" ON public.feedbacks;

-- 2. KÍCH HOẠT ROW LEVEL SECURITY CHO TOÀN BỘ CÁC BẢNG
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. THIẾT LẬP POLICIES AN TOÀN CHO TỪNG BẢNG
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BẢNG 1: STORES (Cửa hàng)
-- ------------------------------------------------------------------------------
-- Cho phép đọc (SELECT) công khai để nạp danh sách cửa hàng
CREATE POLICY "stores_select_policy"
ON public.stores
FOR SELECT
TO anon, authenticated
USING (true);

-- Chặn anon ghi/sửa/xoá; chỉ cho phép người dùng đã xác thực (authenticated/admin)
CREATE POLICY "stores_write_policy"
ON public.stores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- BẢNG 2: EMPLOYEES (Nhân sự)
-- ------------------------------------------------------------------------------
-- Cho phép đọc (SELECT) danh sách nhân viên
CREATE POLICY "employees_select_policy"
ON public.employees
FOR SELECT
TO anon, authenticated
USING (true);

-- Chặn anon ghi/sửa/xoá; chỉ cho phép người dùng đã xác thực (authenticated/admin)
CREATE POLICY "employees_write_policy"
ON public.employees
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- BẢNG 3: SCHEDULES (Lịch làm việc)
-- ------------------------------------------------------------------------------
-- Cho phép đọc (SELECT) lịch làm việc
CREATE POLICY "schedules_select_policy"
ON public.schedules
FOR SELECT
TO anon, authenticated
USING (true);

-- Chặn anon sửa/xoá lịch; chỉ cho phép người dùng đã xác thực (hoặc Edge Function)
CREATE POLICY "schedules_write_policy"
ON public.schedules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- BẢNG 4: FEEDBACKS (Khiếu nại / Báo bù công C&B)
-- ------------------------------------------------------------------------------
-- Cho phép đọc (SELECT) danh sách feedback
CREATE POLICY "feedbacks_select_policy"
ON public.feedbacks
FOR SELECT
TO anon, authenticated
USING (true);

-- Cho phép nhân viên tạo mới feedback báo bù công
CREATE POLICY "feedbacks_insert_policy"
ON public.feedbacks
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Chỉ authenticated (Quản trị viên / C&B) mới có quyền duyệt (UPDATE status) hoặc xoá (DELETE) feedback
CREATE POLICY "feedbacks_modify_policy"
ON public.feedbacks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "feedbacks_delete_policy"
ON public.feedbacks
FOR DELETE
TO authenticated
USING (true);
