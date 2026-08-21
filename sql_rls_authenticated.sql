-- ==============================================================================
-- OFC: RLS sau khi app đã đăng nhập Supabase Auth (JWT)
-- Chạy file này TRÊN SQL Editor sau khi code login JWT đã deploy.
--
-- Trước khi chạy:
-- 1. Authentication → Providers → Email → TẮT "Confirm email"
-- 2. User Auth của NV được tạo khi admin bấm Thêm nhân viên (không phải lúc NV login)
--    Admin login lần đầu vẫn tự tạo admin@ofc.app
-- 3. Đăng nhập lại app (admin / 1 hoặc mã NV / 1)
--    Email tự sinh: admin@ofc.app hoặc {mãNV}@ofc.app
--    Mật khẩu form vẫn là 1; Auth dùng ofc-{id}-1 (≥ 6 ký tự)
--
-- Anon vẫn ĐỌC employees/stores/schedules (cần để màn login tra mã NV).
-- Anon KHÔNG ghi. Mọi INSERT/UPDATE/DELETE cần JWT.
-- ==============================================================================

ALTER TABLE IF EXISTS public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_swaps ENABLE ROW LEVEL SECURITY;

-- Xóa policy cũ (mọi bản SQL trước đó)
DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.stores;
DROP POLICY IF EXISTS "Allow all for anon" ON public.stores;
DROP POLICY IF EXISTS "Public stores access" ON public.stores;
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_write_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_modify_policy" ON public.stores;

DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.employees;
DROP POLICY IF EXISTS "Allow all for anon" ON public.employees;
DROP POLICY IF EXISTS "Public employees access" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_modify_policy" ON public.employees;

DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.schedules;
DROP POLICY IF EXISTS "Allow all for anon" ON public.schedules;
DROP POLICY IF EXISTS "Public schedules access" ON public.schedules;
DROP POLICY IF EXISTS "schedules_select_policy" ON public.schedules;
DROP POLICY IF EXISTS "schedules_write_policy" ON public.schedules;
DROP POLICY IF EXISTS "schedules_modify_policy" ON public.schedules;

DROP POLICY IF EXISTS "Cho phép đọc, ghi tất cả" ON public.feedbacks;
DROP POLICY IF EXISTS "Allow all for anon" ON public.feedbacks;
DROP POLICY IF EXISTS "Public feedbacks access" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_select_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_modify_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_update_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_delete_policy" ON public.feedbacks;

DROP POLICY IF EXISTS "shift_swaps_select_policy" ON public.shift_swaps;
DROP POLICY IF EXISTS "shift_swaps_insert_policy" ON public.shift_swaps;
DROP POLICY IF EXISTS "shift_swaps_update_policy" ON public.shift_swaps;

CREATE OR REPLACE FUNCTION public.jwt_emp_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'user_metadata' ->> 'emp_id', '');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'is_manager') IN ('true', 't', '1')
    OR (auth.jwt() ->> 'email') = 'admin@ofc.app',
    false
  );
$$;

-- STORES
CREATE POLICY "stores_select_policy" ON public.stores
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stores_admin_modify_policy" ON public.stores
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- EMPLOYEES: anon đọc để login tra mã NV
CREATE POLICY "employees_select_policy" ON public.employees
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "employees_admin_modify_policy" ON public.employees
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- SCHEDULES
CREATE POLICY "schedules_select_policy" ON public.schedules
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "schedules_write_own_or_admin" ON public.schedules
  FOR ALL TO authenticated
  USING (
    public.is_admin_or_manager()
    OR emp_id = public.jwt_emp_id()
  )
  WITH CHECK (
    public.is_admin_or_manager()
    OR emp_id = public.jwt_emp_id()
  );

-- FEEDBACKS
CREATE POLICY "feedbacks_select_policy" ON public.feedbacks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedbacks_insert_policy" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR emp_id = public.jwt_emp_id()
  );
CREATE POLICY "feedbacks_update_policy" ON public.feedbacks
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "feedbacks_delete_policy" ON public.feedbacks
  FOR DELETE TO authenticated
  USING (public.is_admin_or_manager());

-- SHIFT_SWAPS
CREATE POLICY "shift_swaps_select_policy" ON public.shift_swaps
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_swaps_insert_policy" ON public.shift_swaps
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR from_emp_id = public.jwt_emp_id()
  );
CREATE POLICY "shift_swaps_update_policy" ON public.shift_swaps
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_manager()
    OR from_emp_id = public.jwt_emp_id()
    OR to_emp_id = public.jwt_emp_id()
  )
  WITH CHECK (
    public.is_admin_or_manager()
    OR from_emp_id = public.jwt_emp_id()
    OR to_emp_id = public.jwt_emp_id()
  );
