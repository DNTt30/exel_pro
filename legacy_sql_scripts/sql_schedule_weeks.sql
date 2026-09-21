-- Trạng thái duyệt lịch theo cửa hàng + tuần: draft → pending → approved | rejected
CREATE TABLE IF NOT EXISTS public.schedule_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  week_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  submitted_by text,
  submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (store_id, week_date)
);

CREATE INDEX IF NOT EXISTS schedule_weeks_store_week_idx ON public.schedule_weeks (store_id, week_date);

ALTER TABLE public.schedule_weeks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedule_weeks_all" ON public.schedule_weeks;
CREATE POLICY "schedule_weeks_all" ON public.schedule_weeks
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
