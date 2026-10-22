-- Separate proposals; never writes schedules or schedule_weeks.
BEGIN;
CREATE TABLE public.schedule_drafts (
  store_id text NOT NULL REFERENCES public.stores(id),
  week_date date NOT NULL CHECK (extract(isodow FROM week_date) = 1),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload ?& ARRAY['schedule','sourceSchedule','constraints']),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, week_date)
);
ALTER TABLE public.schedule_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schedule_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.schedule_drafts TO authenticated;
CREATE POLICY schedule_drafts_read ON public.schedule_drafts FOR SELECT TO authenticated
  USING (public.has_permission('schedule.write', store_id));

-- CAS prevents a repeated run or another reviewer from silently overwriting a draft.
CREATE FUNCTION public.save_schedule_draft(p_store text, p_week date, p_payload jsonb, p_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE saved public.schedule_drafts;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.has_permission('schedule.write', p_store), false) THEN
    RAISE EXCEPTION 'DRAFT_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_revision IS NULL OR p_revision < 0 OR p_payload IS NULL
    OR octet_length(p_payload::text) > 1048576
    OR jsonb_typeof(p_payload->'schedule') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_payload->'sourceSchedule') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_payload->'constraints') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'INVALID_DRAFT';
  END IF;
  IF EXISTS (SELECT 1 FROM (
      SELECT jsonb_object_keys(p_payload->'schedule') AS id
      UNION SELECT jsonb_object_keys(p_payload->'sourceSchedule') AS id
    ) AS ids
    WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = ids.id AND e.dept = p_store AND coalesce(e.is_active,true))) THEN
    RAISE EXCEPTION 'DRAFT_EMPLOYEE_OUT_OF_SCOPE' USING ERRCODE = '42501';
  END IF;
  IF p_revision = 0 THEN
    INSERT INTO public.schedule_drafts(store_id, week_date, payload, updated_by)
    VALUES (p_store, p_week, p_payload, auth.uid()) ON CONFLICT DO NOTHING RETURNING * INTO saved;
  ELSE
    UPDATE public.schedule_drafts SET payload = p_payload, revision = revision + 1, updated_by = auth.uid(), updated_at = now()
    WHERE store_id = p_store AND week_date = p_week AND revision = p_revision RETURNING * INTO saved;
  END IF;
  IF saved.store_id IS NULL THEN RAISE EXCEPTION 'DRAFT_CONFLICT: mở nháp đã lưu trước khi lưu tiếp' USING ERRCODE = '40001'; END IF;
  RETURN jsonb_build_object('payload', saved.payload, 'revision', saved.revision);
END;
$$;
REVOKE ALL ON FUNCTION public.save_schedule_draft(text,date,jsonb,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_schedule_draft(text,date,jsonb,integer) TO authenticated;
COMMENT ON TABLE public.schedule_drafts IS 'Unpublished proposals only. Constraints are rechecked by the existing schedule write path when a manager applies a proposal.';
COMMIT;
