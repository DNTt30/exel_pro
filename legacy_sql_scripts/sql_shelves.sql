-- Kệ hàng + hạn dùng: SM giao kệ cho NV, NV ghi date, cảnh báo trước N ngày.
CREATE TABLE IF NOT EXISTS public.store_shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  code text NOT NULL,
  name text,
  assignee_id text,
  notify_days int DEFAULT 3,
  due_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (store_id, code)
);

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

CREATE INDEX IF NOT EXISTS shelf_items_shelf_idx ON public.shelf_items (shelf_id);
CREATE INDEX IF NOT EXISTS shelf_items_expiry_idx ON public.shelf_items (expiry_date);

ALTER TABLE public.store_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_shelves_all" ON public.store_shelves;
DROP POLICY IF EXISTS "shelf_items_all" ON public.shelf_items;

CREATE POLICY "store_shelves_all" ON public.store_shelves
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "shelf_items_all" ON public.shelf_items
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.store_shelves ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.shelf_items ADD COLUMN IF NOT EXISTS expiry_date_2 date;
