-- ============================================================
-- PUSH NOTIFICATION — Chạy script này trên Supabase SQL Editor
-- ============================================================

-- Tạo bảng lưu Web Push subscriptions của từng NV
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  user_id     TEXT        PRIMARY KEY,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: NV chỉ đọc/sửa row của mình; service role (Edge Function) đọc tất cả
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_subscription"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Index tìm theo user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

-- ============================================================
-- VAPID Keys — generate bằng lệnh này (chạy một lần):
-- npx web-push generate-vapid-keys
-- Sau đó set vào Supabase secrets:
--   supabase secrets set VAPID_PUBLIC_KEY=xxx VAPID_PRIVATE_KEY=yyy VAPID_SUBJECT=mailto:admin@gs25.com
-- Và set vào .env frontend:
--   VITE_VAPID_PUBLIC_KEY=xxx   (cùng public key)
-- ============================================================
