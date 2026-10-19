BEGIN;
CREATE TABLE IF NOT EXISTS public.registration_deadlines (
 store_id text NOT NULL REFERENCES public.stores(id), week_date text NOT NULL DEFAULT '*',
 config jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by text NOT NULL,
 PRIMARY KEY(store_id,week_date)
);
ALTER TABLE public.registration_deadlines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registration_deadlines FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.registration_deadlines TO authenticated;
DROP POLICY IF EXISTS registration_deadlines_read ON public.registration_deadlines;
CREATE POLICY registration_deadlines_read ON public.registration_deadlines FOR SELECT TO authenticated USING (
 public.current_emp_id() IS NOT NULL AND (public.can_manage_store(store_id) OR store_id IN (SELECT public.my_member_stores())));

CREATE OR REPLACE FUNCTION public.registration_default_config() RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT '{"enabled":true,"dayKey":"T5","time":"18:00","customDeadline":null,"isForceClosed":false,"isForceOpen":false}'::jsonb;
$$;
CREATE OR REPLACE FUNCTION public.get_registration_deadline(p_store text,p_week text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE common public.registration_deadlines; specific public.registration_deadlines;
BEGIN
 IF auth.uid() IS NULL OR public.current_emp_id() IS NULL OR NOT (public.can_manage_store(p_store) OR p_store IN (SELECT public.my_member_stores())) THEN
   RAISE EXCEPTION 'DEADLINE_FORBIDDEN' USING ERRCODE='42501';
 END IF;
 IF p_week IS NULL OR p_week !~ '^\d{4}-\d{2}-\d{2}$' OR extract(isodow FROM p_week::date)<>1 THEN RAISE EXCEPTION 'INVALID_WEEK'; END IF;
 SELECT * INTO common FROM registration_deadlines WHERE store_id=p_store AND week_date='*';
 SELECT * INTO specific FROM registration_deadlines WHERE store_id=p_store AND week_date=p_week;
 RETURN jsonb_build_object('config',registration_default_config()||coalesce(specific.config,common.config,'{}'),
   'defaultRevision',coalesce(common.revision,0),'weekRevision',coalesce(specific.revision,0),'serverNow',now());
END $$;
CREATE OR REPLACE FUNCTION public.save_registration_deadline(
 p_store text,p_week text,p_config jsonb,p_all boolean,p_default_revision integer,p_week_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE snapshot jsonb; value jsonb; k text;
BEGIN
 IF auth.uid() IS NULL OR public.current_emp_id() IS NULL OR NOT public.can_manage_store(p_store) THEN RAISE EXCEPTION 'DEADLINE_FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM stores WHERE id=p_store AND is_active) THEN RAISE EXCEPTION 'INVALID_STORE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('registration:'||p_store,0));
 snapshot:=get_registration_deadline(p_store,p_week);
 IF (snapshot->>'defaultRevision')::integer IS DISTINCT FROM p_default_revision OR (snapshot->>'weekRevision')::integer IS DISTINCT FROM p_week_revision THEN
   RAISE EXCEPTION 'DEADLINE_CONFLICT' USING ERRCODE='40001';
 END IF;
 IF p_all IS NULL OR jsonb_typeof(p_config) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'INVALID_DEADLINE'; END IF;
 value:=registration_default_config()||p_config;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(value) x WHERE x NOT IN ('enabled','dayKey','time','customDeadline','isForceClosed','isForceOpen')) THEN RAISE EXCEPTION 'INVALID_DEADLINE'; END IF;
 FOREACH k IN ARRAY ARRAY['enabled','isForceClosed','isForceOpen'] LOOP
   IF jsonb_typeof(value->k) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'INVALID_DEADLINE'; END IF;
 END LOOP;
 IF coalesce(value->>'dayKey','') NOT IN ('T2','T3','T4','T5','T6','T7','CN') OR coalesce(value->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  OR ((value->>'isForceClosed')::boolean AND (value->>'isForceOpen')::boolean) THEN RAISE EXCEPTION 'INVALID_DEADLINE'; END IF;
 IF value->>'customDeadline' IS NOT NULL THEN
   IF p_all OR jsonb_typeof(value->'customDeadline')<>'string' OR (value->>'customDeadline') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
     OR NOT isfinite((value->>'customDeadline')::timestamptz) THEN RAISE EXCEPTION 'INVALID_DEADLINE'; END IF;
 END IF;
 INSERT INTO registration_deadlines(store_id,week_date,config,updated_by)
 VALUES(p_store,CASE WHEN p_all THEN '*' ELSE p_week END,value,public.current_emp_id())
 ON CONFLICT(store_id,week_date) DO UPDATE SET config=excluded.config,revision=registration_deadlines.revision+1,updated_at=now(),updated_by=excluded.updated_by;
 IF p_all THEN DELETE FROM registration_deadlines WHERE store_id=p_store AND week_date=p_week; END IF;
 INSERT INTO admin_logs(actor_id,actor_name,action,target,detail) VALUES(public.current_emp_id(),public.current_emp_id(),'registration.deadline_saved',p_store,
   jsonb_build_object('week',p_week,'allWeeks',p_all,'config',value)::text);
 RETURN get_registration_deadline(p_store,p_week);
END $$;

CREATE OR REPLACE FUNCTION public.guard_registration_deadline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE employee text; week text; store text; cfg jsonb; cutoff timestamptz; offset_days integer;
BEGIN
 IF auth.uid() IS NULL OR public.is_admin() OR public.has_role('STORE_MANAGER') OR public.has_role('AREA_MANAGER') THEN
   IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN employee:=OLD.emp_id; week:=OLD.week_date; ELSE employee:=NEW.emp_id; week:=NEW.week_date; END IF;
 IF employee IS DISTINCT FROM public.current_emp_id() THEN RAISE EXCEPTION 'DEADLINE_FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.my_member_stores()) THEN RAISE EXCEPTION 'DEADLINE_FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND NEW.shifts IS NOT DISTINCT FROM OLD.shifts THEN RETURN NEW; END IF;
 FOR store IN SELECT public.my_member_stores() ORDER BY 1 LOOP
   PERFORM pg_advisory_xact_lock(hashtextextended('registration:'||store,0));
   cfg:=get_registration_deadline(store,week)->'config';
   IF NOT (cfg->>'enabled')::boolean THEN CONTINUE; END IF;
   IF (cfg->>'isForceClosed')::boolean THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
   IF (cfg->>'isForceOpen')::boolean THEN CONTINUE; END IF;
   offset_days:=CASE cfg->>'dayKey' WHEN 'T2' THEN 7 WHEN 'T3' THEN 6 WHEN 'T4' THEN 5 WHEN 'T5' THEN 4 WHEN 'T6' THEN 3 WHEN 'T7' THEN 2 ELSE 1 END;
   cutoff:=coalesce((cfg->>'customDeadline')::timestamptz,
     ((week::date-offset_days)+(cfg->>'time')::time) AT TIME ZONE 'Asia/Ho_Chi_Minh');
   IF clock_timestamp()>=cutoff THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS registration_deadline_guard ON public.schedules;
CREATE TRIGGER registration_deadline_guard BEFORE INSERT OR UPDATE OR DELETE ON public.schedules
 FOR EACH ROW EXECUTE FUNCTION public.guard_registration_deadline();
REVOKE ALL ON FUNCTION public.guard_registration_deadline() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_registration_deadline(text,text),public.save_registration_deadline(text,text,jsonb,boolean,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_registration_deadline(text,text),public.save_registration_deadline(text,text,jsonb,boolean,integer,integer) TO authenticated;

-- Receipts are private to the authenticated person. Event keys include the server
-- event revision, so a newly updated schedule notification becomes unread again.
CREATE TABLE IF NOT EXISTS public.notification_receipts (
 emp_id text NOT NULL, event_key text NOT NULL CHECK(length(event_key) BETWEEN 1 AND 240),
 read_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(emp_id,event_key)
);
ALTER TABLE public.notification_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.notification_receipts TO authenticated;
DROP POLICY IF EXISTS notification_receipts_own ON public.notification_receipts;
CREATE POLICY notification_receipts_own ON public.notification_receipts FOR SELECT TO authenticated USING(emp_id=public.current_emp_id());
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_keys text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR public.current_emp_id() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_keys IS NULL OR cardinality(p_keys)>200 OR EXISTS(SELECT 1 FROM unnest(p_keys) k WHERE k IS NULL OR length(k) NOT BETWEEN 1 AND 240) THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_KEYS'; END IF;
 INSERT INTO notification_receipts(emp_id,event_key) SELECT public.current_emp_id(),k FROM unnest(p_keys) k ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(text[]) TO authenticated;

-- Dashboard reads real conversation records. Remove legacy unrestricted policies
-- before exposing this source; mixed-store conversations require every store.
CREATE TABLE IF NOT EXISTS public.ai_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id text NOT NULL,
 store_id text,user_id text,user_message text,assistant_response text,intent text,model text,
 tokens_used integer,latency_ms integer,context_used jsonb,error text,created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_conversations_store_time ON public.ai_conversations(store_id,created_at DESC);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_conversations' LOOP
  EXECUTE format('DROP POLICY %I ON public.ai_conversations',p.policyname);
 END LOOP;
END $$;
REVOKE ALL ON public.ai_conversations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.ai_conversations TO authenticated;
CREATE POLICY ai_conversations_read ON public.ai_conversations FOR SELECT TO authenticated USING (
 public.current_emp_id() IS NOT NULL AND (user_id=public.current_emp_id() OR public.is_admin() OR (
  nullif(trim(store_id),'') IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM unnest(string_to_array(store_id,',')) s WHERE trim(s)='' OR trim(s)='ALL' OR NOT public.can_manage_store(trim(s))
  )
 ))
);
CREATE POLICY ai_conversations_insert ON public.ai_conversations FOR INSERT TO authenticated WITH CHECK (
 user_id=public.current_emp_id() AND (
  public.is_admin() OR (store_id='ALL' AND public.has_role('AREA_MANAGER')) OR (
   nullif(trim(store_id),'') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM unnest(string_to_array(store_id,',')) s WHERE trim(s)='' OR trim(s)='ALL' OR NOT (
     public.can_manage_store(trim(s)) OR trim(s) IN (SELECT public.my_member_stores())
    )
   )
  )
 )
);
COMMIT;
