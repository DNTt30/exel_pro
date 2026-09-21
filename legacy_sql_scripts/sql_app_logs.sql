-- OFC: 3 bảng nhật ký. actor/resource dùng TEXT vì mã NV 9 số, mã CH VN0xxx.
-- Chạy trên Supabase SQL editor. Không ghi password / JWT / API key / OTP.

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text,
  user_id text,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'activity',
  entity_type text,
  entity_id text,
  description text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text,
  actor_id text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  store_id text,
  user_id text,
  user_message text,
  assistant_response text,
  intent text,
  model text,
  tokens_used int,
  latency_ms int,
  context_used jsonb,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_store_time_idx ON public.activity_logs (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_time_idx ON public.activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON public.activity_logs (action);

CREATE INDEX IF NOT EXISTS audit_logs_store_time_idx ON public.audit_logs (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_time_idx ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON public.audit_logs (resource_type, resource_id);

CREATE INDEX IF NOT EXISTS ai_conversations_user_time_idx ON public.ai_conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_conversations_conv_idx ON public.ai_conversations (conversation_id, created_at);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_all" ON public.activity_logs;
DROP POLICY IF EXISTS "audit_logs_all" ON public.audit_logs;
DROP POLICY IF EXISTS "ai_conversations_all" ON public.ai_conversations;

CREATE POLICY "activity_logs_all" ON public.activity_logs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "audit_logs_all" ON public.audit_logs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "ai_conversations_all" ON public.ai_conversations
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
