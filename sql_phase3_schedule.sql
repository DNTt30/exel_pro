-- ==============================================================================
-- OFC PHASE 3 - SCHEDULE ENGINE BACKEND (idempotent)
--   A. schedules: cot versioning (version/updated_at/updated_by) + unique key
--   B. RPC upsert_schedules_bulk: ghi hang loat ATOMIC + OPTIMISTIC LOCKING
--      (gui kem expect_version; DB tang version; sai version -> loi CONFLICT)
--   C. schedule_weeks: approval state machine DRAFT->SUBMITTED->APPROVED/REJECTED
-- ==============================================================================

-- ---------- A. VERSIONING ----------
alter table public.schedules add column if not exists version    integer     not null default 1;
alter table public.schedules add column if not exists updated_at timestamptz not null default now();
alter table public.schedules add column if not exists updated_by text;
create unique index if not exists uq_schedules_week_emp on public.schedules(week_date, emp_id);

-- ---------- B. BULK UPSERT + OPTIMISTIC LOCKING ----------
-- Input: [{"week_date":"2026-08-10","emp_id":"...","shifts":{...},"expect_version":12}]
-- expect_version bo qua (null) = last-write-wins cho truong hop tao moi.
create or replace function public.upsert_schedules_bulk(p_rows jsonb)
returns table (o_emp_id text, o_week_date text, o_version integer)
language plpgsql security invoker set search_path = public as $$
declare
  r record;
  v_cur integer;
  v_new integer;
begin
  for r in select * from jsonb_to_recordset(p_rows)
             as x(week_date text, emp_id text, shifts jsonb, expect_version integer)
  loop
    select s.version into v_cur from public.schedules s
     where s.week_date = r.week_date and s.emp_id = r.emp_id
       for update;
    if found then
      if r.expect_version is not null and v_cur <> r.expect_version then
        raise exception 'CONFLICT: emp=% db_version=% gui=%', r.emp_id, v_cur, r.expect_version
          using errcode = '40001';
      end if;
      update public.schedules s
         set shifts = r.shifts,
             version = s.version + 1,
             updated_at = now(),
             updated_by = public.current_emp_id()
       where s.week_date = r.week_date and s.emp_id = r.emp_id
      returning s.version into v_new;
    else
      insert into public.schedules (week_date, emp_id, shifts, version, updated_by, updated_at)
      values (r.week_date, r.emp_id, r.shifts, 1, public.current_emp_id(), now())
      returning version into v_new;
    end if;
    o_emp_id := r.emp_id; o_week_date := r.week_date; o_version := v_new;
    return next;
  end loop;
end $$;
grant execute on function public.upsert_schedules_bulk(jsonb) to authenticated;

-- ---------- C. APPROVAL STATE MACHINE TREN schedule_weeks ----------
alter table public.schedule_weeks add column if not exists status           text not null default 'draft';
alter table public.schedule_weeks add column if not exists submitted_by     text;
alter table public.schedule_weeks add column if not exists submitted_at     timestamptz;
alter table public.schedule_weeks add column if not exists approved_by      text;
alter table public.schedule_weeks add column if not exists approved_at      timestamptz;
alter table public.schedule_weeks add column if not exists rejected_by      text;
alter table public.schedule_weeks add column if not exists rejected_at      timestamptz;
alter table public.schedule_weeks add column if not exists rejection_reason text;

do $$ begin
  alter table public.schedule_weeks drop constraint if exists ck_weeks_status;
  alter table public.schedule_weeks add constraint ck_weeks_status
    check (status in ('draft','submitted','approved','rejected'));
exception when others then raise notice 'ck_weeks_status skip: %', sqlerrm; end $$;

-- Guard: kiem soat chuyen trang thai theo vai tro (DB la chan cuoi)
create or replace function public.weeks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor text; is_adm bool; is_am bool; is_sm bool;
begin
  if new.status = old.status then return new; end if;
  actor := public.current_emp_id();
  is_adm := public.is_admin();
  is_am  := public.has_role('AREA_MANAGER');
  is_sm  := public.has_role('STORE_MANAGER');

  if old.status = 'draft'    and new.status = 'submitted' then
    if not (is_sm or is_am or is_adm) then raise exception 'PERMISSION_DENIED: chi quan ly duoc trinh tuan'; end if;
    new.submitted_by := actor; new.submitted_at := now();
  elsif old.status = 'submitted' and new.status = 'approved' then
    if not (is_am or is_adm) then raise exception 'PERMISSION_DENIED: chi AM/ADMIN duoc duyet'; end if;
    new.approved_by := actor; new.approved_at := now();
  elsif old.status = 'submitted' and new.status = 'rejected' then
    if not (is_am or is_adm) then raise exception 'PERMISSION_DENIED: chi AM/ADMIN duoc tu choi'; end if;
    new.rejected_by := actor; new.rejected_at := now(); new.rejection_reason := coalesce(new.rejection_reason,'');
  elsif old.status = 'rejected' and new.status = 'draft' then
    if not (is_am or is_adm or new.submitted_by = actor or old.submitted_by = actor) then raise exception 'PERMISSION_DENIED'; end if;
  elsif old.status = 'approved' and new.status = 'draft' then
    if not (is_am or is_adm) then raise exception 'PERMISSION_DENIED: mo lai tuan da duyet chi AM/ADMIN'; end if;
  else
    raise exception 'INVALID_TRANSITION: % -> %', old.status, new.status;
  end if;
  return new;
end $$;
drop trigger if exists trg_weeks_guard on public.schedule_weeks;
create trigger trg_weeks_guard before update on public.schedule_weeks
for each row execute function public.weeks_guard();

-- Kiem tra:
select column_name from information_schema.columns where table_name='schedules' and column_name in ('version','updated_at','updated_by');
select column_name from information_schema.columns where table_name='schedule_weeks' and column_name like '%_at' or column_name='status';