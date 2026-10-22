BEGIN;
-- A dedicated JWT database role does not inherit ordinary staff privileges.
CREATE ROLE schedule_bot NOLOGIN NOINHERIT;
GRANT schedule_bot TO authenticator;
GRANT USAGE ON SCHEMA public,auth TO schedule_bot;
GRANT EXECUTE ON FUNCTION auth.uid() TO schedule_bot;
CREATE TABLE public.schedule_bot_scopes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id text NOT NULL REFERENCES public.stores(id),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,store_id)
);
ALTER TABLE public.schedule_bot_scopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schedule_bot_scopes FROM PUBLIC,anon,authenticated;

-- Bot identities have no employee record and therefore no existing staff/manager authority.
CREATE FUNCTION public.has_schedule_bot_scope(p_store text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND public.current_emp_id() IS NULL AND EXISTS (
    SELECT 1 FROM public.schedule_bot_scopes b JOIN public.stores s ON s.id=b.store_id
    WHERE b.user_id=auth.uid() AND b.store_id=p_store AND b.enabled AND s.is_active);
$$;
REVOKE ALL ON FUNCTION public.has_schedule_bot_scope(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_schedule_bot_scope(text) TO authenticated,schedule_bot;

CREATE FUNCTION public.can_write_schedule_draft(p_store text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT coalesce(public.has_permission('schedule.write',p_store),false) OR public.has_schedule_bot_scope(p_store);
$$;
REVOKE ALL ON FUNCTION public.can_write_schedule_draft(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_write_schedule_draft(text) TO authenticated,schedule_bot;
GRANT SELECT ON public.schedule_drafts TO schedule_bot;
GRANT EXECUTE ON FUNCTION public.save_schedule_draft(text,date,jsonb,integer) TO schedule_bot;

DROP POLICY schedule_drafts_read ON public.schedule_drafts;
CREATE POLICY schedule_drafts_read ON public.schedule_drafts FOR SELECT TO authenticated,schedule_bot
USING (public.can_write_schedule_draft(store_id));

-- Change only the draft function's permission check. No schedule write policies are widened.
DO $$ DECLARE body text;
BEGIN
  body := pg_get_functiondef('public.save_schedule_draft(text,date,jsonb,integer)'::regprocedure);
  IF position('public.has_permission(''schedule.write'', p_store)' IN body)=0 THEN
    RAISE EXCEPTION 'Unexpected draft function; review permission change before applying';
  END IF;
  EXECUTE replace(body, 'public.has_permission(''schedule.write'', p_store)', 'public.can_write_schedule_draft(p_store)');
END $$;

CREATE FUNCTION public.get_schedule_bot_context(p_store text,p_week date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF NOT coalesce(public.has_schedule_bot_scope(p_store),false) THEN
    RAISE EXCEPTION 'BOT_SCOPE_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_week IS NULL OR extract(isodow FROM p_week)<>1 THEN RAISE EXCEPTION 'INVALID_WEEK'; END IF;
  SELECT jsonb_build_object(
    'store', (SELECT jsonb_build_object('id',s.id,'name',s.name,'staffing',s.staffing) FROM public.stores s WHERE s.id=p_store),
    'employees', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'dept',e.dept,'type',e.type,'role',e.role,'maxH',e.max_h,'skills',e.skills,'isActive',e.is_active) ORDER BY e.id),'[]') FROM public.employees e WHERE e.dept=p_store AND e.is_active),
    'schedules', (SELECT coalesce(jsonb_agg(jsonb_build_object('emp_id',s.emp_id,'week_date',s.week_date,'shifts',s.shifts,'version',s.version)),'[]') FROM public.schedules s JOIN public.employees e ON e.id=s.emp_id WHERE e.dept=p_store AND e.is_active AND s.week_date IN ((p_week-7)::text,p_week::text,(p_week+7)::text)),
    'weeks', (SELECT coalesce(jsonb_agg(jsonb_build_object('storeId',w.store_id,'weekDate',w.week_date,'status',w.status)),'[]') FROM public.schedule_weeks w WHERE w.store_id=p_store AND w.week_date=p_week::text)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_schedule_bot_context(text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_schedule_bot_context(text,date) TO authenticated,schedule_bot;
NOTIFY pgrst,'reload schema';
COMMIT;
