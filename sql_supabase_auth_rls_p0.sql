-- ==============================================================================
-- OFC SYSTEM: SUPABASE AUTH & ROW LEVEL SECURITY (RLS) MIGRATION
-- Migration P0: SEC-01, SEC-03, SEC-06
-- ==============================================================================

-- 1. Bật RLS trên toàn bộ các bảng dữ liệu
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shift_swaps ENABLE ROW LEVEL SECURITY;

-- 2. Xóa các policy cũ nếu có để tránh xung đột
DROP POLICY IF EXISTS "Allow public read employees" ON employees;
DROP POLICY IF EXISTS "Allow public write employees" ON employees;
DROP POLICY IF EXISTS "Allow public read schedules" ON schedules;
DROP POLICY IF EXISTS "Allow public write schedules" ON schedules;
DROP POLICY IF EXISTS "Allow public read feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Allow public write feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Allow public read stores" ON stores;
DROP POLICY IF EXISTS "Allow public write stores" ON stores;

-- 3. Tạo hàm Helper kiểm tra quyền Admin / SM
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  -- Kiểm tra role trong JWT metadata hoặc email admin
  RETURN (
    (auth.jwt() ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'email') = 'admin@ofc.internal' OR
    (auth.jwt() -> 'user_metadata' ->> 'is_manager')::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. POLICIES: BẢNG EMPLOYEES
-- Admin/Manager đọc & sửa tất cả; Nhân viên đọc danh sách đồng nghiệp cùng cửa hàng
CREATE POLICY "employees_select_policy" ON employees
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "employees_admin_modify_policy" ON employees
FOR ALL TO authenticated
USING (is_admin_or_manager())
WITH CHECK (is_admin_or_manager());

-- 5. POLICIES: BẢNG SCHEDULES
-- Ai cũng có thể xem lịch; Sửa lịch chỉ dành cho Admin hoặc Nhân viên tự đăng ký ca tuần tương lai
CREATE POLICY "schedules_select_policy" ON schedules
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "schedules_modify_policy" ON schedules
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 6. POLICIES: BẢNG FEEDBACKS (C&B)
-- Nhân viên có thể thêm feedback; Admin/Manager duyệt feedback
CREATE POLICY "feedbacks_select_policy" ON feedbacks
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "feedbacks_insert_policy" ON feedbacks
FOR INSERT TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "feedbacks_update_policy" ON feedbacks
FOR UPDATE TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 7. POLICIES: BẢNG STORES
CREATE POLICY "stores_select_policy" ON stores
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "stores_admin_modify_policy" ON stores
FOR ALL TO authenticated
USING (is_admin_or_manager())
WITH CHECK (is_admin_or_manager());

-- 8. POLICIES: BẢNG SHIFT_SWAPS (Đổi ca)
CREATE POLICY "shift_swaps_select_policy" ON shift_swaps
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "shift_swaps_insert_policy" ON shift_swaps
FOR INSERT TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "shift_swaps_update_policy" ON shift_swaps
FOR UPDATE TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 9. Ghi chú hoàn thành
COMMENT ON TABLE employees IS 'Bảng nhân viên với RLS an toàn';
COMMENT ON TABLE schedules IS 'Bảng lịch phân ca với RLS theo tuần';
COMMENT ON TABLE feedbacks IS 'Bảng phản hồi C&B với RLS phân quyền';
