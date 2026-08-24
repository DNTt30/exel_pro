-- Trạng thái hoạt động của nhân viên: khóa mã khi nghỉ việc.
-- is_active = false => đăng nhập bị từ chối ở useStore.login.

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Cách dùng (SQL Editor):
--   Vô hiệu hóa: UPDATE public.employees SET is_active = false WHERE id = '260716009';
--   Mở lại:      UPDATE public.employees SET is_active = true  WHERE id = '260716009';
-- (Hoặc bấm nút khóa/mở ngay trong trang Quản lý Nhân sự sau khi deploy app.)
