BEGIN;
-- Private, bounded rolling window; no prompt, response or credential is stored.
CREATE TABLE IF NOT EXISTS public.copilot_request_limits (
  employee_id text PRIMARY KEY,
  accepted_at timestamptz[] NOT NULL DEFAULT '{}'
);
ALTER TABLE public.copilot_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.copilot_request_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.copilot_request_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_copilot_request(p_employee_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE events timestamptz[]; current_time_at timestamptz; wait_seconds integer;
BEGIN
  IF p_employee_id IS NULL OR (p_employee_id <> 'admin' AND p_employee_id !~ '^\d{9}$') THEN
    RAISE EXCEPTION 'INVALID_COPILOT_IDENTITY';
  END IF;
  INSERT INTO public.copilot_request_limits(employee_id) VALUES(p_employee_id) ON CONFLICT DO NOTHING;
  SELECT accepted_at INTO events FROM public.copilot_request_limits WHERE employee_id=p_employee_id FOR UPDATE;
  -- Read wall clock AFTER locking: concurrent workers cannot consume the same slot.
  current_time_at := clock_timestamp();
  SELECT coalesce(array_agg(t ORDER BY t),'{}'::timestamptz[]) INTO events
    FROM unnest(events) t WHERE t > current_time_at - interval '60 seconds';
  IF cardinality(events) >= 10 THEN
    wait_seconds := greatest(1,ceil(extract(epoch FROM events[1] + interval '60 seconds' - current_time_at))::integer);
  ELSIF cardinality(events) > 0 AND events[cardinality(events)] > current_time_at - interval '3 seconds' THEN
    wait_seconds := greatest(1,ceil(extract(epoch FROM events[cardinality(events)] + interval '3 seconds' - current_time_at))::integer);
  END IF;
  IF wait_seconds IS NOT NULL THEN
    RETURN jsonb_build_object('allowed',false,'retryAfter',wait_seconds);
  END IF;
  UPDATE public.copilot_request_limits SET accepted_at=array_append(events,current_time_at) WHERE employee_id=p_employee_id;
  RETURN jsonb_build_object('allowed',true);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_copilot_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_copilot_request(text) TO service_role;
COMMIT;
