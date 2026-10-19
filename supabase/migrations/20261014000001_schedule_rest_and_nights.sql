-- Operational policy: 12h between work days; at most 3 consecutive night shifts.
-- Existing RLS, serialized writes, deferred enforcement and Admin audit remain in force.
BEGIN;
CREATE OR REPLACE FUNCTION public.check_schedule_rules() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE shifts jsonb; emp public.employees; cap numeric; hours numeric; violation jsonb:='[]'; pair record; reason text; work_days integer;
BEGIN
 SELECT * INTO emp FROM employees WHERE id=NEW.emp_id;
 SELECT s.shifts INTO shifts FROM schedules s WHERE s.emp_id=NEW.emp_id AND s.week_date=NEW.week_date;
 IF shifts IS NULL THEN RETURN NULL; END IF;
 cap:=least(coalesce(nullif(emp.max_h,0),48),CASE WHEN upper(emp.type) IN ('STPT','PARTTIME') THEN 23 ELSE 48 END);
 SELECT coalesce(sum(work_hours),0) INTO hours FROM schedule_segments(NEW.week_date,shifts);
 IF hours>cap THEN violation:=violation||jsonb_build_array(jsonb_build_object('code','OVER_MAX_HOURS','employeeId',NEW.emp_id,'hours',hours,'limit',cap)); END IF;
 FOR pair IN
  WITH segments AS (
   SELECT x.*,s.week_date FROM schedules s CROSS JOIN LATERAL schedule_segments(s.week_date,s.shifts) x
    WHERE s.emp_id=NEW.emp_id AND s.week_date IN (NEW.week_date,to_char(NEW.week_date::date-7,'YYYY-MM-DD'),to_char(NEW.week_date::date+7,'YYYY-MM-DD'))
  ), ordered AS (
   SELECT *,lag(end_at) OVER(ORDER BY start_at,end_at) previous_end,
    lag(day_date) OVER(ORDER BY start_at,end_at) previous_day,
    lag(week_date) OVER(ORDER BY start_at,end_at) previous_week FROM segments
  ) SELECT * FROM ordered WHERE (week_date=NEW.week_date OR previous_week=NEW.week_date) AND previous_end IS NOT NULL
 LOOP
  IF pair.start_at<pair.previous_end THEN
   RAISE EXCEPTION 'SCHEDULE_OVERLAP: % %',NEW.emp_id,pair.day_date USING ERRCODE='22023';
  END IF;
  IF pair.day_date<>pair.previous_day AND pair.start_at-pair.previous_end<interval '12 hours' THEN
   violation:=violation||jsonb_build_array(jsonb_build_object('code','INSUFFICIENT_REST','employeeId',NEW.emp_id,'date',pair.day_date,'hours',extract(epoch FROM pair.start_at-pair.previous_end)/3600,'limit',12));
  END IF;
 END LOOP;
 -- Count distinct shift start dates, not split-shift segments. Include both
 -- adjacent weeks so changing either side of a boundary cannot bypass the limit.
 FOR pair IN
  WITH nights AS (
   SELECT DISTINCT x.day_date FROM schedules s
   CROSS JOIN LATERAL schedule_segments(s.week_date,s.shifts) x
   WHERE s.emp_id=NEW.emp_id AND s.week_date IN
    (NEW.week_date,to_char(NEW.week_date::date-7,'YYYY-MM-DD'),to_char(NEW.week_date::date+7,'YYYY-MM-DD'))
    AND (x.start_at<x.day_date+interval '6 hours' OR x.end_at>x.day_date+interval '22 hours')
  ), islands AS (
   SELECT day_date,day_date-(row_number() OVER(ORDER BY day_date))::integer AS island FROM nights
  ) SELECT count(*) AS nights,max(day_date) FILTER(WHERE day_date BETWEEN NEW.week_date::date AND NEW.week_date::date+6) AS current_day
    FROM islands GROUP BY island HAVING count(*)>3
    AND bool_or(day_date BETWEEN NEW.week_date::date AND NEW.week_date::date+6)
 LOOP
  violation:=violation||jsonb_build_array(jsonb_build_object('code','CONSECUTIVE_NIGHTS','employeeId',NEW.emp_id,'date',pair.current_day,'count',pair.nights,'limit',3));
 END LOOP;
 SELECT count(DISTINCT day_date) INTO work_days FROM schedule_segments(NEW.week_date,shifts);
 IF upper(emp.type) NOT IN ('STPT','PARTTIME') AND work_days>6 THEN
  violation:=violation||jsonb_build_array(jsonb_build_object('code','MAX_WORK_DAYS','employeeId',NEW.emp_id,'count',work_days,'limit',6));
 END IF;
 IF jsonb_array_length(violation)>0 THEN
  reason:=nullif(btrim(current_setting('app.schedule_override_reason',true)),'');
  IF NOT public.has_permission('schedule.override') OR reason IS NULL OR length(reason)<10 OR length(reason)>500 THEN
   RAISE EXCEPTION 'SCHEDULE_RULES' USING ERRCODE='P0001',DETAIL=violation::text;
  END IF;
  INSERT INTO server_audit_events(actor_id,action,resource_type,resource_id,store_id,new_data,metadata)
   VALUES(public.current_emp_id(),'schedule.override','schedules',NEW.week_date||':'||NEW.emp_id,emp.dept,shifts,jsonb_build_object('reason',reason,'violations',violation,'source','database'));
 END IF;
 RETURN NULL;
END;
$$;
COMMIT;
