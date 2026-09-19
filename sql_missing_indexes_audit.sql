-- ==============================================================================
-- SCHEDULE APP (GS25) — DATABASE INDEX OPTIMIZATION & AUDIT FIXES
-- Tối ưu hóa chỉ mục CSDL, loại bỏ hoàn toàn Full Table Scan và khắc phục
-- các chỉ mục thiếu / sai tên cột trên môi trường Supabase PostgreSQL.
-- An toàn & Idempotent (chạy nhiều lần không gây lỗi).
-- ==============================================================================

-- 1. BẢNG EMPLOYEES:
-- Khắc phục lỗi tạo index trên cột không tồn tại 'status' (cột chuẩn là 'is_active')
DROP INDEX IF EXISTS public.idx_employees_status;
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_dept_active ON public.employees(dept, is_active);

-- 2. BẢNG SHELF_ITEMS (Hàng hóa & Date trên kệ):
-- CỰC KỲ QUAN TRỌNG: Loại bỏ Full Table Scan khi hàm getShelfItems({ storeId })
-- chạy lúc ứng dụng khởi động (bootstrap) và mỗi khi Realtime WebSocket sync dữ liệu.
CREATE INDEX IF NOT EXISTS idx_shelf_items_store ON public.shelf_items(store_id);
CREATE INDEX IF NOT EXISTS idx_shelf_items_store_expiry ON public.shelf_items(store_id, expiry_date);

-- 3. BẢNG SCHEDULE_WEEKS (Trạng thái nộp/duyệt lịch tuần):
-- Tối ưu hóa truy vấn getScheduleWeeks() tải 250 tuần gần nhất:
-- SELECT * FROM schedule_weeks ORDER BY week_date DESC LIMIT 250
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_week_date ON public.schedule_weeks(week_date DESC);

-- 4. BẢNG SHIFT_SWAPS (Đơn xin đổi ca):
-- Tối ưu hóa truy vấn lọc đơn đổi ca của cửa hàng sắp xếp theo thời gian mới nhất:
-- WHERE store = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_shift_swaps_store_created ON public.shift_swaps(store, created_at DESC);

-- 5. BẢNG FEEDBACKS (Khiếu nại / Bù công C&B):
-- Tối ưu hóa truy vấn getFeedbacks() theo cửa hàng hoặc nhân viên kèm sắp xếp mới nhất:
CREATE INDEX IF NOT EXISTS idx_feedbacks_dept_created ON public.feedbacks(dept, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_emp_created ON public.feedbacks(emp_id, created_at DESC);

-- 6. BẢNG ATTENDANCE (Chấm công thực tế):
-- Hỗ trợ tra cứu nhanh lịch sử công của 1 nhân viên độc lập với khoảng ngày
CREATE INDEX IF NOT EXISTS idx_attendance_emp_id ON public.attendance(emp_id);

-- 7. CÁC BẢNG NHẬT KÝ HỆ THỐNG (LOGS):
-- Hỗ trợ truy vấn nhật ký toàn hệ thống cho Quản trị viên (Admin) không kèm điều kiện store_id:
-- ORDER BY created_at DESC LIMIT 300
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON public.ai_conversations(created_at DESC);

-- Thông báo hoàn thành
DO $$
BEGIN
  RAISE NOTICE '✅ Đã áp dụng toàn bộ chỉ mục tối ưu hóa cho dự án thành công!';
END $$;
