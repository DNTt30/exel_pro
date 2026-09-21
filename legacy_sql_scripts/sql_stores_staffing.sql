-- Định biên theo cửa hàng (JSON weekday / weekend).
-- Chạy trên SQL Editor. App vẫn chạy nếu chưa có cột (dùng default 2-2-1).
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS staffing jsonb
  DEFAULT '{"weekday":{"6-14":2,"14-22":2,"22-6":1},"weekend":{"6-14":2,"14-22":2,"22-6":1}}'::jsonb;
