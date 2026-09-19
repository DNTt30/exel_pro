-- ==============================================================================
-- GS25 SCHEDULE APP — MASTER BASELINE SCHEMA MIGRATION
-- Migration Timestamp: 20260919000000
-- Idempotent script: Thích hợp chạy trên Supabase CLI hoặc SQL Editor.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CORE TABLES
-- Bảng Cửa hàng (stores)
CREATE TABLE IF NOT EXISTS public.stores (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text DEFAULT 'Hồ Chí Minh',
  sm_id text,
  is_active boolean NOT NULL DEFAULT true,
  staffing jsonb,
  demand jsonb,
  created_at timestamptz DEFAULT now()
);

-- Bảng Nhân viên (employees)
CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  name text NOT NULL,
  dept text NOT NULL,
  type text NOT NULL DEFAULT 'STFT',
  role text,
  job_title text,
  max_h numeric NOT NULL DEFAULT 48,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Bảng Phân quyền cửa hàng (user_store_roles)
CREATE TABLE IF NOT EXISTS public.user_store_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_emp_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  app_role text NOT NULL DEFAULT 'employee',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_emp_id, store_id, app_role)
);

-- Bảng Lịch làm việc phân ca (schedules)
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_date text NOT NULL,
  emp_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shifts jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_schedules_week_emp UNIQUE(week_date, emp_id)
);

-- Bảng Trạng thái tuần (schedule_weeks)
CREATE TABLE IF NOT EXISTS public.schedule_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  week_date text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  submitted_by text,
  submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, week_date)
);

-- Bảng Đơn xin đổi ca (shift_swaps)
CREATE TABLE IF NOT EXISTS public.shift_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_date text NOT NULL,
  store text NOT NULL,
  from_emp_id text NOT NULL REFERENCES public.employees(id),
  from_emp_name text,
  from_day text NOT NULL,
  from_shift text NOT NULL,
  to_emp_id text NOT NULL REFERENCES public.employees(id),
  to_emp_name text,
  to_day text NOT NULL,
  to_shift text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending_partner',
  manager_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Bảng Khiếu nại / Bù công C&B (feedbacks)
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id text NOT NULL,
  emp_name text,
  dept text,
  emp_role text,
  emp_type text,
  date date,
  shift text,
  hours numeric,
  reason text,
  note text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  resolution_note text,
  created_at timestamptz DEFAULT now()
);

-- Bảng Chấm công thực tế ezHR9 (attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id text NOT NULL REFERENCES public.employees(id),
  work_date date NOT NULL,
  actual_hours numeric NOT NULL DEFAULT 0,
  note text,
  updated_by text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(emp_id, work_date)
);

-- Bảng Kệ hàng (store_shelves)
CREATE TABLE IF NOT EXISTS public.store_shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  code text NOT NULL,
  name text,
  assignee_id text,
  notify_days int DEFAULT 3,
  due_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, code)
);

-- Bảng Hàng hóa trên kệ (shelf_items)
CREATE TABLE IF NOT EXISTS public.shelf_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id uuid NOT NULL REFERENCES public.store_shelves(id) ON DELETE CASCADE,
  store_id text NOT NULL,
  product_name text NOT NULL,
  sku text,
  qty numeric,
  expiry_date date,
  expiry_date_2 date,
  note text,
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

-- 3. TỐI ƯU HÓA CHỈ MỤC HIỆU NĂNG CAO (INDEXES)
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(dept);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_dept_active ON public.employees(dept, is_active);

CREATE INDEX IF NOT EXISTS idx_schedules_week_date ON public.schedules(week_date);
CREATE INDEX IF NOT EXISTS idx_schedules_emp_id ON public.schedules(emp_id);
CREATE INDEX IF NOT EXISTS idx_schedules_week_emp ON public.schedules(week_date, emp_id);

CREATE INDEX IF NOT EXISTS idx_schedule_weeks_week_date ON public.schedule_weeks(week_date DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_store_week ON public.schedule_weeks(store_id, week_date);

CREATE INDEX IF NOT EXISTS idx_shift_swaps_store_created ON public.shift_swaps(store, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_emp_from ON public.shift_swaps(from_emp_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_emp_to ON public.shift_swaps(to_emp_id);

CREATE INDEX IF NOT EXISTS idx_feedbacks_dept_created ON public.feedbacks(dept, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_emp_created ON public.feedbacks(emp_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_range ON public.attendance(work_date, emp_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_id ON public.attendance(emp_id);

CREATE INDEX IF NOT EXISTS idx_shelf_items_store ON public.shelf_items(store_id);
CREATE INDEX IF NOT EXISTS idx_shelf_items_shelf ON public.shelf_items(shelf_id);
CREATE INDEX IF NOT EXISTS idx_shelf_items_expiry ON public.shelf_items(expiry_date);

-- 4. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_items ENABLE ROW LEVEL SECURITY;
