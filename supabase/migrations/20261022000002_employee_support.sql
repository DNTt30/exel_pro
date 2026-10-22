-- Employee onboarding and explicit requests for help. No changes to payroll/schedules.
BEGIN;
CREATE TABLE public.employee_onboarding (
 emp_id text PRIMARY KEY REFERENCES public.employees(id),
 steps jsonb NOT NULL DEFAULT '{}', dismissed boolean NOT NULL DEFAULT false,
 mentor_id text REFERENCES public.employees(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.employee_help_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key uuid NOT NULL,
 emp_id text NOT NULL REFERENCES public.employees(id), store_id text NOT NULL REFERENCES public.stores(id),
 topic text NOT NULL CHECK(topic IN ('schedule','timesheet','handbook','profile','other')),
 question text NOT NULL CHECK(length(trim(question)) BETWEEN 5 AND 2000),
 context_excerpt text NOT NULL DEFAULT '' CHECK(length(context_excerpt)<=3000),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','answered','resolved')),
 assigned_to text, reply text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(emp_id,request_key)
);
CREATE TABLE public.employee_onboarding_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, emp_id text NOT NULL REFERENCES public.employees(id),
 actor_id text NOT NULL, action text NOT NULL, value jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_onboarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_events_read ON public.employee_onboarding_events FOR SELECT TO authenticated
 USING(emp_id=public.current_emp_id() OR public.manages_employee(emp_id));
REVOKE ALL ON public.employee_onboarding_events FROM anon,authenticated;
GRANT SELECT ON public.employee_onboarding_events TO authenticated;
CREATE TABLE public.employee_help_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid REFERENCES public.employee_help_requests(id) NOT NULL,
 actor_id text NOT NULL, action text NOT NULL, body text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.employee_answer_feedback (
 emp_id text NOT NULL REFERENCES public.employees(id), message_key text NOT NULL CHECK(length(message_key) BETWEEN 1 AND 200),
 store_id text NOT NULL REFERENCES public.stores(id),
 rating text NOT NULL CHECK(rating IN ('understood','unclear')),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(emp_id,message_key)
);
ALTER TABLE public.employee_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_help_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_answer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_read ON public.employee_onboarding FOR SELECT TO authenticated
 USING(emp_id=public.current_emp_id() OR public.manages_employee(emp_id));
CREATE POLICY help_read ON public.employee_help_requests FOR SELECT TO authenticated
 USING(emp_id=public.current_emp_id() OR public.can_manage_store(store_id));
CREATE POLICY help_events_read ON public.employee_help_events FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.employee_help_requests r WHERE r.id=request_id));
CREATE POLICY answer_feedback_read ON public.employee_answer_feedback FOR SELECT TO authenticated
 USING(emp_id=public.current_emp_id() OR public.can_manage_store(store_id));
REVOKE ALL ON public.employee_onboarding,public.employee_help_requests,public.employee_help_events,public.employee_answer_feedback FROM anon,authenticated;
GRANT SELECT ON public.employee_onboarding,public.employee_help_requests,public.employee_help_events,public.employee_answer_feedback TO authenticated;
CREATE INDEX help_store_created ON public.employee_help_requests(store_id,created_at,id);

CREATE FUNCTION public.save_my_onboarding(p_step text, p_value boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE who text:=public.current_emp_id(); result public.employee_onboarding;
BEGIN
 IF who IS NULL OR NOT EXISTS(SELECT 1 FROM employees WHERE id=who AND is_active) THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_value IS NULL OR p_step IS NULL OR p_step NOT IN ('dismissed','profile_viewed','profile_understood','schedule_viewed','schedule_understood','registration_viewed','registration_understood','timesheet_viewed','timesheet_understood','handbook_viewed','handbook_understood') THEN RAISE EXCEPTION 'INVALID_STEP'; END IF;
 INSERT INTO employee_onboarding(emp_id) VALUES(who) ON CONFLICT DO NOTHING;
 UPDATE employee_onboarding SET
 steps=CASE WHEN p_step='dismissed' THEN steps ELSE steps || jsonb_build_object(p_step,p_value) END,
 dismissed=CASE WHEN p_step='dismissed' THEN p_value ELSE dismissed END, updated_at=now()
 WHERE emp_id=who RETURNING * INTO result;
 INSERT INTO employee_onboarding_events(emp_id,actor_id,action,value) VALUES(who,who,p_step,to_jsonb(p_value));
 RETURN to_jsonb(result);
END $$;

CREATE FUNCTION public.assign_employee_mentor(p_employee text,p_mentor text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.current_emp_id() IS NULL OR NOT coalesce(public.manages_employee(p_employee),false) THEN RAISE EXCEPTION 'HELP_FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF p_mentor IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM employees e JOIN employees m ON m.id=p_mentor AND m.is_active
  WHERE e.id=p_employee AND e.is_active AND e.id<>m.id AND EXISTS(
    SELECT 1 FROM unnest(string_to_array(e.dept,',')) d WHERE trim(d)=ANY(regexp_split_to_array(m.dept,'\s*,\s*'))))
 THEN RAISE EXCEPTION 'MENTOR_OUT_OF_STORE'; END IF;
 INSERT INTO employee_onboarding(emp_id,mentor_id) VALUES(p_employee,p_mentor)
 ON CONFLICT(emp_id) DO UPDATE SET mentor_id=excluded.mentor_id,updated_at=now();
 INSERT INTO employee_onboarding_events(emp_id,actor_id,action,value) VALUES(p_employee,public.current_emp_id(),'assign_mentor',jsonb_build_object('mentor',p_mentor));
END $$;

CREATE FUNCTION public.employee_start_roster() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'dept',e.dept,
 'steps',coalesce(o.steps,'{}'::jsonb),'dismissed',coalesce(o.dismissed,false),
 'mentorId',o.mentor_id,'mentorName',CASE WHEN m.is_active THEN m.name END,'updatedAt',o.updated_at) ORDER BY e.id),'[]'::jsonb)
 FROM employees e LEFT JOIN employee_onboarding o ON o.emp_id=e.id LEFT JOIN employees m ON m.id=o.mentor_id
 WHERE public.current_emp_id() IS NOT NULL AND e.is_active AND (e.id=public.current_emp_id() OR public.manages_employee(e.id));
$$;

CREATE FUNCTION public.create_employee_help(p_key uuid,p_store text,p_topic text,p_question text,p_context text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE who text:=public.current_emp_id(); result public.employee_help_requests;
BEGIN
 IF who IS NULL OR NOT coalesce(p_store IN (SELECT public.my_member_stores()),false) THEN RAISE EXCEPTION 'HELP_FORBIDDEN' USING ERRCODE='42501'; END IF;
 INSERT INTO employee_help_requests(request_key,emp_id,store_id,topic,question,context_excerpt)
 VALUES(p_key,who,p_store,p_topic,trim(p_question),coalesce(p_context,''))
 ON CONFLICT(emp_id,request_key) DO NOTHING RETURNING * INTO result;
 IF result.id IS NULL THEN
  SELECT * INTO result FROM employee_help_requests WHERE emp_id=who AND request_key=p_key;
  IF result.store_id IS DISTINCT FROM p_store OR result.topic IS DISTINCT FROM p_topic
     OR result.question IS DISTINCT FROM trim(p_question) OR result.context_excerpt IS DISTINCT FROM coalesce(p_context,'') THEN
   RAISE EXCEPTION 'HELP_RETRY_CONTENT_MISMATCH';
  END IF;
 ELSE
  INSERT INTO employee_help_events(request_id,actor_id,action) VALUES(result.id,who,'created');
 END IF;
 RETURN to_jsonb(result);
END $$;

CREATE FUNCTION public.act_employee_help(p_id uuid,p_revision integer,p_action text,p_reply text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE who text:=public.current_emp_id(); r public.employee_help_requests; next_status text;
BEGIN
 SELECT * INTO r FROM employee_help_requests WHERE id=p_id FOR UPDATE;
 IF who IS NULL OR r.id IS NULL OR NOT (r.emp_id=who OR coalesce(public.can_manage_store(r.store_id),false)) THEN RAISE EXCEPTION 'HELP_FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF p_revision IS NULL OR r.revision<>p_revision THEN RAISE EXCEPTION 'HELP_CONFLICT'; END IF;
 IF p_action IN ('start','answer') THEN
  IF NOT coalesce(public.can_manage_store(r.store_id),false) OR r.emp_id=who THEN RAISE EXCEPTION 'HELP_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF r.status='resolved' THEN RAISE EXCEPTION 'HELP_INVALID_TRANSITION'; END IF;
  IF p_action='start' AND r.status<>'new' THEN RAISE EXCEPTION 'HELP_INVALID_TRANSITION'; END IF;
  IF p_action='answer' AND (p_reply IS NULL OR length(trim(p_reply)) NOT BETWEEN 5 AND 3000) THEN RAISE EXCEPTION 'HELP_REPLY_REQUIRED'; END IF;
  next_status:=CASE WHEN p_action='start' THEN 'in_progress' ELSE 'answered' END;
 ELSIF p_action IN ('resolve','reopen') THEN
  IF r.emp_id<>who THEN RAISE EXCEPTION 'HELP_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF (p_action='resolve' AND r.status<>'answered') OR (p_action='reopen' AND r.status NOT IN ('answered','resolved')) THEN RAISE EXCEPTION 'HELP_INVALID_TRANSITION'; END IF;
  next_status:=CASE WHEN p_action='resolve' THEN 'resolved' ELSE 'new' END;
 ELSE RAISE EXCEPTION 'HELP_INVALID_TRANSITION'; END IF;
 UPDATE employee_help_requests SET status=next_status, revision=revision+1, updated_at=now(),
 assigned_to=CASE WHEN p_action IN ('start','answer') THEN who WHEN p_action='reopen' THEN NULL ELSE assigned_to END,
 reply=CASE WHEN p_action='answer' THEN trim(p_reply) ELSE reply END
 WHERE id=p_id RETURNING * INTO r;
 INSERT INTO employee_help_events(request_id,actor_id,action,body) VALUES(p_id,who,p_action,CASE WHEN p_action='answer' THEN trim(p_reply) ELSE '' END);
 RETURN to_jsonb(r);
END $$;

CREATE FUNCTION public.save_employee_answer_feedback(p_key text,p_store text,p_rating text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.current_emp_id() IS NULL OR NOT coalesce(p_store IN (SELECT public.my_member_stores()),false) THEN RAISE EXCEPTION 'HELP_FORBIDDEN' USING ERRCODE='42501'; END IF;
 INSERT INTO employee_answer_feedback(emp_id,message_key,store_id,rating) VALUES(public.current_emp_id(),p_key,p_store,p_rating)
 ON CONFLICT(emp_id,message_key) DO UPDATE SET rating=excluded.rating,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.save_my_onboarding(text,boolean),public.assign_employee_mentor(text,text),public.employee_start_roster(),public.create_employee_help(uuid,text,text,text,text),public.act_employee_help(uuid,integer,text,text),public.save_employee_answer_feedback(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_my_onboarding(text,boolean),public.assign_employee_mentor(text,text),public.employee_start_roster(),public.create_employee_help(uuid,text,text,text,text),public.act_employee_help(uuid,integer,text,text),public.save_employee_answer_feedback(text,text,text) TO authenticated;
COMMIT;
