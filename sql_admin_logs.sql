-- Nhật ký thao tác quản lý (OFC).
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text,
  actor_name text,
  action text NOT NULL,
  target text,
  detail text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_logs_select_policy" ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_insert_policy" ON public.admin_logs;

CREATE POLICY "admin_logs_select_policy" ON public.admin_logs
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_logs_insert_policy" ON public.admin_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);
