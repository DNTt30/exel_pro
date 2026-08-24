-- Bảng OTP 2FA cho admin (Edge Function admin-otp dùng service_role truy cập).
-- RLS bật nhưng KHÔNG có policy nào => anon/authenticated đều không đọc/ghi được;
-- chỉ service_role của Edge Function thao tác.

CREATE TABLE IF NOT EXISTS public.admin_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('otp','device')),
  code_hash text,
  token_hash text,
  attempts int NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_otps_lookup ON public.admin_otps (purpose, consumed, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_otps_token ON public.admin_otps (token_hash);

ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;

-- Dọn mã hết hạn cũ (tuỳ chọn, chạy định kỳ hoặc bằng pg_cron):
-- DELETE FROM public.admin_otps WHERE expires_at < now() - interval '1 day';
