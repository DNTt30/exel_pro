-- Migration: 20260921000002_password_security_enhancement.sql
-- Thêm trường password_changed_at vào bảng employees để theo dõi trạng thái đổi mật khẩu
-- Hỗ trợ Admin giám sát ai đã đổi mật khẩu (xanh), ai còn dùng mật khẩu mặc định (đỏ), ai quá hạn

-- 1. Thêm cột password_changed_at và password_deadline vào employees nếu chưa có
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS password_changed_at timestamptz DEFAULT NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS password_deadline timestamptz DEFAULT NULL;

-- 2. Đồng bộ dữ liệu hiện có từ app_profiles nếu đã có thông tin credential_set_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'app_profiles' AND column_name = 'credential_set_at'
  ) THEN
    UPDATE public.employees e
    SET password_changed_at = p.credential_set_at
    FROM public.app_profiles p
    WHERE e.id = p.emp_id AND p.credential_set_at IS NOT NULL AND e.password_changed_at IS NULL;
  END IF;
END $$;

-- 3. Hàm cho phép nhân viên tự đánh dấu đã đổi mật khẩu (Security Definer)
CREATE OR REPLACE FUNCTION public.mark_my_password_changed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp_id text;
BEGIN
  v_emp_id := public.current_emp_id();
  IF v_emp_id IS NOT NULL THEN
    UPDATE public.employees SET password_changed_at = now() WHERE id = v_emp_id;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_profiles') THEN
      UPDATE public.app_profiles SET credential_set_at = now() WHERE emp_id = v_emp_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_my_password_changed() TO authenticated;

-- 4. Hàm cho phép Admin/SM đặt lại cờ mật khẩu về NULL khi reset mật khẩu cho nhân viên
CREATE OR REPLACE FUNCTION public.admin_reset_employee_password_flag(p_emp_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR public.has_role('AREA_MANAGER') OR public.has_role('STORE_MANAGER') THEN
    UPDATE public.employees SET password_changed_at = NULL WHERE id = p_emp_id;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_profiles') THEN
      UPDATE public.app_profiles SET credential_set_at = NULL WHERE emp_id = p_emp_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Bạn không có quyền thực hiện thao tác này';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_employee_password_flag(text) TO authenticated;
