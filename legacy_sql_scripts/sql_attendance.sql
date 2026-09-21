-- Cong thuc te tu ezHR: SM/admin nhap truc tiep vao bang chams cong trong app.
-- actual_hours = so gio lam thuc te trong ngay (lam tron 0.5); de trong/0 = OFF.
-- Ghi de bang override len gio xep lich khi tinh luong.

CREATE TABLE IF NOT EXISTS public.attendance (
  emp_id       text        NOT NULL,
  work_date    date        NOT NULL,
  actual_hours numeric     NOT NULL DEFAULT 0,
  note         text,
  updated_by   text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (emp_id, work_date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p text; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='attendance'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance', p); END LOOP;
END $$;
CREATE POLICY auth_all_attendance ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
