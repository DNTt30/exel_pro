BEGIN;
-- View uses caller permissions and existing RLS, including the rule requiring
-- access to EVERY store of a mixed-store conversation. No policy is broadened.
CREATE OR REPLACE VIEW public.ai_conversation_activity
WITH (security_invoker=true, security_barrier=true) AS
SELECT id,store_id,user_id,user_message,error,created_at,
  regexp_split_to_array(trim(coalesce(store_id,'')), '\s*,\s*') AS store_ids
FROM public.ai_conversations;
REVOKE ALL ON public.ai_conversation_activity FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ai_conversation_activity TO authenticated;
COMMIT;
