-- Local-only fixture: reproduce production differences observed via schema metadata.
-- Apply to the empty baseline BEFORE old policies, then run the catch-up bundle.
-- No production employee data is included.
ALTER TABLE public.employees ALTER COLUMN id TYPE varchar(9);
ALTER TABLE public.employees ALTER COLUMN dept TYPE varchar(255);
ALTER TABLE public.employees ALTER COLUMN role TYPE varchar(100);
ALTER TABLE public.employees ALTER COLUMN type TYPE varchar(50);
ALTER TABLE public.employees ALTER COLUMN max_h TYPE integer USING max_h::integer;
ALTER TABLE public.stores ALTER COLUMN id TYPE varchar(20);
ALTER TABLE public.stores DROP COLUMN is_active;
ALTER TABLE public.stores DROP COLUMN demand;
ALTER TABLE public.schedule_weeks ALTER COLUMN week_date TYPE date USING week_date::date;
ALTER TABLE public.schedule_weeks ADD CONSTRAINT schedule_weeks_status_check
  CHECK(status IN ('draft','pending','approved','rejected'));
ALTER TABLE public.schedules ALTER COLUMN week_date TYPE varchar(10);
ALTER TABLE public.schedules ALTER COLUMN emp_id TYPE varchar(9);
ALTER TABLE public.store_shelves DROP COLUMN due_date;
ALTER TABLE public.shelf_items DROP COLUMN sku;
ALTER TABLE public.shelf_items DROP COLUMN expiry_date_2;
ALTER TABLE public.feedbacks RENAME COLUMN emp_name TO name;
ALTER TABLE public.feedbacks ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.feedbacks ALTER COLUMN dept SET NOT NULL;
ALTER TABLE public.feedbacks ALTER COLUMN date TYPE varchar(10) USING date::text;
ALTER TABLE public.feedbacks ALTER COLUMN date SET NOT NULL;
ALTER TABLE public.feedbacks ALTER COLUMN shift SET NOT NULL;
ALTER TABLE public.feedbacks ALTER COLUMN hours TYPE integer USING hours::integer;
ALTER TABLE public.feedbacks ALTER COLUMN hours SET NOT NULL;
ALTER TABLE public.feedbacks DROP COLUMN emp_role;
ALTER TABLE public.feedbacks DROP COLUMN emp_type;
ALTER TABLE public.feedbacks DROP COLUMN note;
ALTER TABLE public.feedbacks DROP COLUMN image_url;
ALTER TABLE public.feedbacks DROP COLUMN resolution_note;
ALTER TABLE public.attendance DROP COLUMN id;
ALTER TABLE public.attendance ADD PRIMARY KEY(emp_id,work_date);
CREATE FUNCTION public.save_employee_schedule(p_week_date text,p_emp_id text,p_shifts jsonb)
RETURNS jsonb LANGUAGE sql AS $$ SELECT p_shifts; $$;
-- Synthetic pre-upgrade rows verify backfill without exporting production data.
INSERT INTO stores(id,name) VALUES('LEGACY','Legacy fixture');
INSERT INTO employees(id,name,dept,type) VALUES('900000001','Legacy staff','LEGACY','STFT');
INSERT INTO schedules(week_date,emp_id,shifts,version)
VALUES('2026-08-03','900000001','{"T2":"6-14","T3":"off","T4":""}',7);
INSERT INTO schedule_weeks(store_id,week_date,status) VALUES('LEGACY','2026-08-03','approved');
INSERT INTO feedbacks(emp_id,name,dept,date,shift,hours)
VALUES('900000001','Legacy staff','LEGACY','2026-08-03','6-14',8);
