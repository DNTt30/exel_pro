-- Production uses date week keys; legacy installations may still use text.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_schedule_bot_context(p_store text,p_week date) RETURNS jsonb
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
    'schedules', (SELECT coalesce(jsonb_agg(jsonb_build_object('emp_id',s.emp_id,'week_date',s.week_date,'shifts',s.shifts,'version',s.version)),'[]') FROM public.schedules s JOIN public.employees e ON e.id=s.emp_id WHERE e.dept=p_store AND e.is_active AND s.week_date::date IN (p_week-7,p_week,p_week+7)),
    'weeks', (SELECT coalesce(jsonb_agg(jsonb_build_object('storeId',w.store_id,'weekDate',w.week_date,'status',w.status)),'[]') FROM public.schedule_weeks w WHERE w.store_id=p_store AND w.week_date::date=p_week)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_schedule_bot_context(text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_schedule_bot_context(text,date) TO authenticated,schedule_bot;
NOTIFY pgrst,'reload schema';
COMMIT;
