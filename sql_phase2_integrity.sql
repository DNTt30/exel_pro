-- ==============================================================================
-- OFC PHASE 2 - DATABASE INTEGRITY (chay trong Supabase SQL Editor, idempotent)
-- A. Quet du lieu rac (bao cao truoc khi fix)
-- B. Chuan hoa week_date ve ISO co so 0 ('2026-8-10' -> '2026-08-10')
-- C. FK constraints (tu dong bo qua neu con orphan)
-- D. Index theo query pattern thuc te
-- E. Bang audit_events (event-based, phuc vu Phase 3+)
-- ==============================================================================

-- ---------- A. ORPHAN / CONFLICT SCAN (chay xem ket qua truoc khi quan tam) ----------
select 'orphan_schedules' as check_name, count(*) from public.schedules s
  where not exists (select 1 from public.employees e where e.id = s.emp_id);
select 'orphan_attendance' as check_name, count(*) from public.attendance a
  where not exists (select 1 from public.employees e where e.id = a.emp_id);
select 'bad_sm_ref' as check_name, count(*) from public.stores s
  where s.sm_id is not null and s.sm_id <> ''
    and not exists (select 1 from public.employees e where e.id = s.sm_id);
select 'week_date_conflict' as check_name, emp_id, to_date(week_date,'YYYY-MM-DD') as real_week, count(*) 
  from public.schedules group by 1,2,3 having count(distinct week_date) > 1;

-- ---------- B. CHUAN HOA week_date ----------
update public.schedules s
   set week_date = to_char(to_date(s.week_date,'YYYY-MM-DD'), 'YYYY-MM-DD')
 where s.week_date ~ '^\d{4}-\d{1,2}-\d{1,2}$'
   and s.week_date <> to_char(to_date(s.week_date,'YYYY-MM-DD'), 'YYYY-MM-DD')
   and not exists (select 1 from public.schedules x
                    where x.emp_id = s.emp_id
                      and x.week_date = to_char(to_date(s.week_date,'YYYY-MM-DD'),'YYYY-MM-DD')
                      and x.ctid <> s.ctid);

-- ---------- C. FK CONSTRAINTS (chi them khi khong con orphan) ----------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_stores_sm') then
    if not exists (select 1 from public.stores s where s.sm_id is not null and s.sm_id <> ''
                     and not exists (select 1 from public.employees e where e.id = s.sm_id)) then
      alter table public.stores add constraint fk_stores_sm foreign key (sm_id) references public.employees(id);
    else raise notice 'SKIP fk_stores_sm: con sm_id tro nhan vien khong ton tai'; end if;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_attendance_emp') then
    if not exists (select 1 from public.attendance a where not exists (select 1 from public.employees e where e.id = a.emp_id)) then
      alter table public.attendance add constraint fk_attendance_emp foreign key (emp_id) references public.employees(id);
    else raise notice 'SKIP fk_attendance_emp: con orphan'; end if;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_schedules_emp') then
    if not exists (select 1 from public.schedules s where not exists (select 1 from public.employees e where e.id = s.emp_id)) then
      alter table public.schedules add constraint fk_schedules_emp foreign key (emp_id) references public.employees(id) on delete cascade;
    else raise notice 'SKIP fk_schedules_emp: con orphan'; end if;
  end if;
end $$;

-- ---------- D. INDEXES (ly do gan voi query pattern) ----------
create index if not exists idx_schedules_week_emp  on public.schedules(week_date, emp_id);  -- load lich theo tuan
create index if not exists idx_stores_sm           on public.stores(sm_id) where sm_id is not null;  -- scope SM/visibleDeptIds
create index if not exists idx_admin_logs_created  on public.admin_logs(created_at desc);            -- doc log moi nhat
create index if not exists idx_feedbacks_status    on public.feedbacks(status);                      -- queue pending cua SM

-- ---------- E. AUDIT EVENTS (event-based, chua wire vao ung dung) ----------
create table if not exists public.audit_events (
  event_id     uuid primary key default gen_random_uuid(),
  actor_emp_id text,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  store_id     text,
  before       jsonb,
  after        jsonb,
  request_id   text,
  created_at   timestamptz not null default now()
);
alter table public.audit_events enable row level security;
create index if not exists idx_audit_evt_entity on public.audit_events(entity_type, entity_id);
create index if not exists idx_audit_evt_time    on public.audit_events(created_at desc);

-- Kiem tra cuoi:
select conname from pg_constraint where conname in ('fk_stores_sm','fk_attendance_emp','fk_schedules_emp');
select tablename, indexname from pg_indexes where schemaname='public' and indexname like 'idx_%' order by indexname;