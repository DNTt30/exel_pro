-- Bảng đơn đổi ca (OFC). Chạy trên Supabase SQL editor nếu chưa có bảng.
CREATE TABLE IF NOT EXISTS public.shift_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_date text NOT NULL,
  store text,
  from_emp_id text NOT NULL,
  from_emp_name text,
  from_day text NOT NULL,
  from_shift text,
  to_emp_id text NOT NULL,
  to_emp_name text,
  to_day text NOT NULL,
  to_shift text,
  reason text,
  status text NOT NULL DEFAULT 'pending_partner',
  manager_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shift_swaps_select_policy" ON public.shift_swaps;
DROP POLICY IF EXISTS "shift_swaps_insert_policy" ON public.shift_swaps;
DROP POLICY IF EXISTS "shift_swaps_update_policy" ON public.shift_swaps;

-- Khớp Hướng B (client dùng anon key, chưa có supabase.auth).
CREATE POLICY "shift_swaps_select_policy" ON public.shift_swaps
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "shift_swaps_insert_policy" ON public.shift_swaps
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "shift_swaps_update_policy" ON public.shift_swaps
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
