-- ==============================================================================
-- OFC PHASE 1 - SECURITY HARDENING (chay MOT lan trong Supabase SQL Editor)
-- Idempotent: chay lai an toan. KHONG DROP bang du lieu.
-- Noi dung:
--   000 profiles: map auth.uid() <-> maNV
--   001 app_role enum + user_store_roles (nguon chan ly phan quyen theo CH)
--   002 Backfill: SM tu stores.sm_id, AM tu job_title/type OFC, EMPLOYEE tu dept,
--        FT/PT tu type, ADMIN builtin
--   003 Helper security definer: current_emp_id / has_role / my_stores ...
--   004 RPC login_lookup cho man hinh dang nhap (thay doc thang employees khi chua co phien)
--   005 XOA toan bo policy open_* va thay bang ma tran docs/RLS_MATRIX.md
--   006 Trigger: attendance.updated_by = server-side; feedbacks cam tu duyet;
--        stores chan SM/AM sua sm_id/is_active/name
-- Sau khi chay: dang nhap lai app mot lan de co phien authenticated.
-- Rollback khan cap: chay sql_rls_relax_writes.sql + mo lai log nhu cu.
-- ==============================================================================

begin;

-- ---------- 000) PROFILES ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  emp_id       text unique not null,
  display_name text,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

insert into public.profiles (id, emp_id, display_name)
select u.id,
       case when u.email = 'admin@ofc.app' then 'admin' else split_part(u.email, '@', 1) end,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
from auth.users u
where u.email like '%@ofc.app'
on conflict do nothing;

-- ---------- 001) ROLE ENUM + USER_STORE_ROLES ----------
do $$ begin
  create type public.app_role as enum ('ADMIN','AREA_MANAGER','STORE_MANAGER','FULL_TIME','PART_TIME','EMPLOYEE');
exception when duplicate_object then null; end $$;

create table if not exists public.user_store_roles (
  id          bigint generated always as identity primary key,
  user_emp_id text not null,
  store_id    text references public.stores(id) on delete cascade,
  role        public.app_role not null,
  created_at  timestamptz not null default now(),
  created_by  text,
  unique (user_emp_id, store_id, role)
);
create index if not exists usr_emp_idx   on public.user_store_roles(user_emp_id);
create index if not exists usr_store_idx on public.user_store_roles(store_id);
alter table public.user_store_roles enable row level security;
-- Khong policy: chi service_role + helper security definer doc.

-- ---------- 002) BACKFILL ----------
insert into public.user_store_roles (user_emp_id, store_id, role, created_by)
select s.sm_id, s.id, 'STORE_MANAGER', 'phase1-backfill'
from public.stores s
where s.sm_id is not null and s.sm_id <> ''
on conflict do nothing;

insert into public.user_store_roles (user_emp_id, store_id, role, created_by)
select e.id, s.id, 'AREA_MANAGER', 'phase1-backfill'
from public.employees e
cross join public.stores s
where coalesce(e.is_active, true)
  and (e.type = 'OFC' or upper(coalesce(e.job_title,'')) like '%OFC%' or coalesce(e.job_title,'') ilike '%khu v%')
on conflict do nothing;

insert into public.user_store_roles (user_emp_id, store_id, role, created_by)
values ('admin', null, 'ADMIN', 'phase1-backfill')
on conflict do nothing;

insert into public.user_store_roles (user_emp_id, store_id, role, created_by)
select e.id, trim(t.store), 'EMPLOYEE', 'phase1-backfill'
from public.employees e
cross join lateral unnest(string_to_array(coalesce(e.dept,''), ',')) as t(store)
where coalesce(e.is_active,true) and trim(t.store) <> ''
  and exists (select 1 from public.stores s where s.id = trim(t.store))
on conflict do nothing;

insert into public.user_store_roles (user_emp_id, store_id, role, created_by)
select e.id, trim(t.store),
       case when e.type = 'STFT' then 'FULL_TIME'::app_role else 'PART_TIME'::app_role end,
       'phase1-backfill'
from public.employees e
cross join lateral unnest(string_to_array(coalesce(e.dept,''), ',')) as t(store)
where coalesce(e.is_active,true) and trim(t.store) <> '' and coalesce(e.type,'') in ('STFT','STPT')
  and exists (select 1 from public.stores s where s.id = trim(t.store))
on conflict do nothing;

-- ---------- 003) HELPERS (security definer, tranh de quy RLS) ----------
create or replace function public.current_emp_id() returns text
language sql stable security definer set search_path = public as $$
  select p.emp_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_store_roles
                where user_emp_id = public.current_emp_id() and role = r);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role('ADMIN');
$$;

create or replace function public.my_managed_stores() returns setof text
language sql stable security definer set search_path = public as $$
  select store_id from public.user_store_roles
  where user_emp_id = public.current_emp_id()
    and role in ('STORE_MANAGER','AREA_MANAGER') and store_id is not null;
$$;

create or replace function public.my_member_stores() returns setof text
language sql stable security definer set search_path = public as $$
  select store_id from public.user_store_roles
  where user_emp_id = public.current_emp_id()
    and role in ('EMPLOYEE','FULL_TIME','PART_TIME','STORE_MANAGER','AREA_MANAGER')
    and store_id is not null;
$$;

create or replace function public.dept_in_scope(p_dept text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare t text;
begin
  if p_dept is null then return false; end if;
  foreach t in array string_to_array(p_dept, ',') loop
    if exists (select 1 from public.my_managed_stores() m where m.store_id = trim(t))
       or exists (select 1 from public.my_member_stores() m2 where m2.store_id = trim(t)) then
      return true;
    end if;
  end loop;
  return false;
end $$;

grant execute on function public.current_emp_id(), public.has_role(public.app_role),
  public.is_admin(), public.my_managed_stores(), public.my_member_stores(),
  public.dept_in_scope(text) to authenticated;

-- ---------- 004) LOGIN LOOKUP RPC (truoc khi co phien) ----------
create or replace function public.login_lookup(p_ma text)
returns table (id text, name text, dept text, role text, type text, job_title text,
               max_h numeric, is_active boolean, avatar text)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.dept, e.role, e."type", e.job_title, e.max_h, e.is_active, e.avatar
  from public.employees e
  where e.id = trim(p_ma) limit 1;
$$;
grant execute on function public.login_lookup(text) to anon, authenticated;

-- ---------- 005) POLICIES THEO MA TRAN ----------
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname='public' and (policyname like 'open_%' or policyname like 'p1_%')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.tablename, r.tablename);
  end loop;
end $$;

-- ===== stores =====
create policy p1_stores_sel on public.stores for select to authenticated using (true);
create policy p1_stores_ins on public.stores for insert to authenticated with check (public.is_admin());
create policy p1_stores_upd on public.stores for update to authenticated
  using (public.is_admin() or exists(select 1 from public.my_managed_stores() m where m.store_id = id))
  with check (true);
create policy p1_stores_del on public.stores for delete to authenticated using (public.is_admin());

-- ===== employees =====
create policy p1_emp_sel on public.employees for select to authenticated
  using (public.is_admin() or id = public.current_emp_id() or public.dept_in_scope(dept));
create policy p1_emp_ins on public.employees for insert to authenticated
  with check (public.is_admin() or public.has_role('AREA_MANAGER'));
create policy p1_emp_upd on public.employees for update to authenticated
  using (public.is_admin()
         or (public.has_role('AREA_MANAGER') and public.dept_in_scope(dept))
         or (public.has_role('STORE_MANAGER') and public.dept_in_scope(dept)))
  with check (true);
create policy p1_emp_del on public.employees for delete to authenticated
  using (public.is_admin());

-- ===== schedules: SM ghi chi nhan vien thuoc CH cua minh; AM/ADMIN rong =====
create policy p1_sch_sel on public.schedules for select to authenticated using (true);
create policy p1_sch_all on public.schedules for all to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER'))
  with check (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (public.has_role('STORE_MANAGER') and exists(
          select 1 from public.employees e
          where e.id = schedules.emp_id and public.dept_in_scope(e.dept)))
  );

-- ===== attendance =====
create policy p1_att_sel on public.attendance for select to authenticated
  using (public.is_admin() or emp_id = public.current_emp_id()
         or exists(select 1 from public.employees e
                   where e.id = attendance.emp_id and public.dept_in_scope(e.dept)));
create policy p1_att_ins on public.attendance for insert to authenticated
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));
create policy p1_att_upd on public.attendance for update to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (true);

-- ===== feedbacks: CAM tu duyet chinh minh o tang DB =====
create policy p1_fb_sel on public.feedbacks for select to authenticated
  using (public.is_admin() or emp_id = public.current_emp_id() or public.dept_in_scope(dept));
create policy p1_fb_ins on public.feedbacks for insert to authenticated
  with check (emp_id = public.current_emp_id() or public.is_admin());
create policy p1_fb_upd on public.feedbacks for update to authenticated
  using ((public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
         and emp_id <> public.current_emp_id())
  with check (emp_id <> public.current_emp_id());
create policy p1_fb_del on public.feedbacks for delete to authenticated using (public.is_admin());

-- ===== shift_swaps / shelves / weeks =====
create policy p1_sw_sel on public.shift_swaps for select to authenticated using (true);
create policy p1_sw_ins on public.shift_swaps for insert to authenticated with check (true);
create policy p1_sw_upd on public.shift_swaps for update to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (true);
create policy p1_sw_del on public.shift_swaps for delete to authenticated using (public.is_admin());

create policy p1_shv_sel on public.store_shelves for select to authenticated using (true);
create policy p1_shv_all on public.store_shelves for all to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));
create policy p1_shi_sel on public.shelf_items for select to authenticated using (true);
create policy p1_shi_all on public.shelf_items for all to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));

create policy p1_wks_sel on public.schedule_weeks for select to authenticated using (true);
create policy p1_wks_all on public.schedule_weeks for all to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));

-- ===== LOGS: chi them moi + doc; CAM sua/xoa =====
create policy p1_admlog_sel on public.admin_logs    for select to authenticated using (public.is_admin());
create policy p1_admlog_ins on public.admin_logs    for insert to authenticated with check (true);
create policy p1_actlog_sel on public.activity_logs for select to authenticated using (true);
create policy p1_actlog_ins on public.activity_logs for insert to authenticated with check (true);
create policy p1_audlog_sel on public.audit_logs    for select to authenticated using (public.is_admin());
create policy p1_audlog_ins on public.audit_logs    for insert to authenticated with check (true);
create policy p1_aiconv_sel on public.ai_conversations for select to authenticated using (true);
create policy p1_aiconv_ins on public.ai_conversations  for insert to authenticated with check (true);

-- ---------- 006) TRIGGERS ----------
create or replace function public.att_actor_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := coalesce(nullif(new.updated_by,''), public.current_emp_id(), 'system');
  return new;
end $$;
drop trigger if exists trg_att_actor on public.attendance;
create trigger trg_att_actor before insert or update on public.attendance
for each row execute function public.att_actor_stamp();

create or replace function public.stores_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.sm_id   is distinct from old.sm_id
       or new.is_active is distinct from old.is_active
       or new.name      is distinct from old.name then
      raise exception 'PERMISSION_DENIED: chi ADMIN duoc sua thong tin cua hang';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_stores_guard on public.stores;
create trigger trg_stores_guard before update on public.stores
for each row execute function public.stores_guard();

commit;

-- ---------- KIEM TRA SAU CHAY ----------
-- 1) Khong con policy open_:        select count(*) from pg_policies where schemaname='public' and policyname like 'open_%';  -- = 0
-- 2) Phan bo vai tro:               select role, count(*) from user_store_roles group by role order by role;
-- 3) anon bi chan ghi (test tay):   insert into feedbacks(emp_id,dept,status) values ('x','VN0485','pending');  -- phai bao loi quyen
