-- ==============================================================================
-- SCHEDULE APP (OFC) — HIGH CONCURRENCY PERFORMANCE INDEXES (100 CONCURRENT USERS)
-- Chạy trên Supabase SQL Editor để tăng tốc độ truy vấn, chống full table scan
-- và loại bỏ hoàn toàn hiện tượng nghẽn I/O khi nhiều nhân viên/quản lý cùng thao tác.
-- ==============================================================================

-- 1. Bảng SCHEDULES (Lịch làm việc phân ca)
-- Tăng tốc truy vấn theo tuần và nhân viên
CREATE INDEX IF NOT EXISTS idx_schedules_week_date ON public.schedules(week_date);
CREATE INDEX IF NOT EXISTS idx_schedules_emp_id ON public.schedules(emp_id);

-- 2. Bảng SHIFT_SWAPS (Đơn đổi ca nhân viên)
-- Tăng tốc lọc đơn đổi ca cá nhân và duyệt đơn theo cửa hàng
CREATE INDEX IF NOT EXISTS idx_shift_swaps_week ON public.shift_swaps(week_date);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_emp_from ON public.shift_swaps(from_emp_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_emp_to ON public.shift_swaps(to_emp_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_store_status ON public.shift_swaps(store, status);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_created ON public.shift_swaps(created_at DESC);

-- 3. Bảng FEEDBACKS (Khiếu nại / Bù công C&B)
-- Tăng tốc lọc đơn theo cửa hàng, trạng thái duyệt và nhân viên
CREATE INDEX IF NOT EXISTS idx_feedbacks_emp ON public.feedbacks(emp_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_dept_status ON public.feedbacks(dept, status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON public.feedbacks(created_at DESC);

-- 4. Bảng SCHEDULE_WEEKS (Trạng thái phê duyệt tuần)
-- Tối ưu hóa kiểm tra tuần đã chốt hay đang mở đăng ký
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_store_week ON public.schedule_weeks(store_id, week_date);
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_status ON public.schedule_weeks(status);

-- 5. Bảng ATTENDANCE (Chấm công thực tế)
-- Tối ưu hóa tải chu kỳ công theo khoảng ngày
CREATE INDEX IF NOT EXISTS idx_attendance_range ON public.attendance(work_date, emp_id);

-- 6. Bảng EMPLOYEES (Nhân sự cửa hàng)
-- Tối ưu hóa phân nhóm nhân viên theo cửa hàng
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(dept);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- Thông báo hoàn thành
DO $$
BEGIN
  RAISE NOTICE '✅ Đã thiết lập thành công toàn bộ chỉ mục hiệu năng cao cho 100 người dùng đồng thời!';
END $$;
