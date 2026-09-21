-- Doanh số + lượt khách TB ngày (GS25 Direct / nhập tay) theo weekday vs weekend.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS demand jsonb
  DEFAULT '{"weekday":{"customers":0,"sales":0},"weekend":{"customers":0,"sales":0}}'::jsonb;
