-- ==============================================================================
-- OFC PHASE 1 HOTFIX v2 — BAT RLS + quet sach policy cu (chi giu p1_*)
-- Chay sau khi da chay sql_phase1_security.sql. Idempotent. Khong dong du lieu.
-- ==============================================================================

-- 1) BAT RLS (policy chi co tac dung khi rowsecurity = on)
alter table public.stores           enable row level security;
alter table public.employees        enable row level security;
alter table public.schedules        enable row level security;
alter table public.feedbacks        enable row level security;
alter table public.shift_swaps      enable row level security;
alter table public.store_shelves    enable row level security;
alter table public.shelf_items      enable row level security;
alter table public.schedule_weeks   enable row level security;
alter table public.attendance       enable row level security;
alter table public.admin_logs       enable row level security;
alter table public.activity_logs    enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.ai_conversations enable row level security;

-- 2) Xoa MOI policy khong phai p1_* con sot lai
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname='public'
             and tablename in ('stores','employees','schedules','feedbacks','shift_swaps',
                               'store_shelves','shelf_items','schedule_weeks','attendance',
                               'admin_logs','activity_logs','audit_logs','ai_conversations')
             and policyname not like 'p1\_%'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3) Tai tao bo p1_* (idempotent: drop truoc khi create)

-- ===== stores =====
drop policy if exists p1_stores_sel on public.stores;
create policy p1_stores_sel on public.stores for select to authenticated using (true);
drop policy if exists p1_stores_ins on public.stores;
create policy p1_stores_ins on public.stores for insert to authenticated with check (public.is_admin());
drop policy if exists p1_stores_upd on public.stores;
create policy p1_stores_upd on public.stores for update to authenticated
  using (public.is_admin() or exists(select 1 from public.my_managed_stores() ms where ms = id))
  with check (true);
drop policy if exists p1_stores_del on public.stores;
create policy p1_stores_del on public.stores for delete to authenticated using (public.is_admin());

-- ===== employees =====
drop policy if exists p1_emp_sel on public.employees;
create policy p1_emp_sel on public.employees for select to authenticated
  using (public.is_admin() or id = public.current_emp_id() or public.dept_in_scope(dept));
drop policy if exists p1_emp_ins on public.employees;
create policy p1_emp_ins on public.employees for insert to authenticated
  with check (public.is_admin() or public.has_role('AREA_MANAGER'));
drop policy if exists p1_emp_upd on public.employees;
create policy p1_emp_upd on public.employees for update to authenticated
  using (public.is_admin()
         or (public.has_role('AREA_MANAGER') and public.dept_in_scope(dept))
         or (public.has_role('STORE_MANAGER') and public.dept_in_scope(dept)))
  with check (true);
drop policy if exists p1_emp_del on public.employees;
create policy p1_emp_del on public.employees for delete to authenticated
  using (public.is_admin());

-- ===== schedules =====
drop policy if exists p1_sch_sel on public.schedules;
create policy p1_sch_sel on public.schedules for select to authenticated using (true);
drop policy if exists p1_sch_all on public.schedules;
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
drop policy if exists p1_att_sel on public.attendance;
create policy p1_att_sel on public.attendance for select to authenticated
  using (public.is_admin() or emp_id = public.current_emp_id()
         or exists(select 1 from public.employees e
                   where e.id = attendance.emp_id and public.dept_in_scope(e.dept)));
drop policy if exists p1_att_ins on public.attendance;
create policy p1_att_ins on public.attendance for insert to authenticated
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));
drop policy if exists p1_att_upd on public.attendance;
create policy p1_att_upd on public.attendance for update to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (true);

-- ===== feedbacks =====
drop policy if exists p1_fb_sel on public.feedbacks;
create policy p1_fb_sel on public.feedbacks for select to authenticated
  using (public.is_admin() or emp_id = public.current_emp_id() or public.dept_in_scope(dept));
drop policy if exists p1_fb_ins on public.feedbacks;
create policy p1_fb_ins on public.feedbacks for insert to authenticated
  with check (emp_id = public.current_emp_id() or public.is_admin());
drop policy if exists p1_fb_upd on public.feedbacks;
create policy p1_fb_upd on public.feedbacks for update to authenticated
  using ((public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
         and emp_id <> public.current_emp_id())
  with check (emp_id <> public.current_emp_id());
drop policy if exists p1_fb_del on public.feedbacks;
create policy p1_fb_del on public.feedbacks for delete to authenticated using (public.is_admin());

-- ===== shift_swaps =====
drop policy if exists p1_sw_sel on public.shift_swaps;
create policy p1_sw_sel on public.shift_swaps for select to authenticated using (true);
drop policy if exists p1_sw_ins on public.shift_swaps;
create policy p1_sw_ins on public.shift_swaps for insert to authenticated with check (true);
drop policy if exists p1_sw_upd on public.shift_swaps;
create policy p1_sw_upd on public.shift_swaps for update to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (true);
drop policy if exists p1_sw_del on public.shift_swaps;
create policy p1_sw_del on public.shift_swaps for delete to authenticated using (public.is_admin());

-- ===== shelves / weeks =====
drop policy if exists p1_shv_sel on public.store_shelves;
create policy p1_shv_sel on public.store_shelves for select to authenticated using (true);
drop policy if exists p1_shv_all on public.store_shelves;
create policy p1_shv_all on public.store_shelves for all to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));
drop policy if exists p1_shi_sel on public.shelf_items;
create policy p1_shi_sel on public.shelf_items for select to authenticated using (true);
drop policy if exists p1_shi_all on public.shelf_items;
create policy p1_shi_all on public.shelf_items for all to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));

drop policy if exists p1_wks_sel on public.schedule_weeks;
create policy p1_wks_sel on public.schedule_weeks for select to authenticated using (true);
drop policy if exists p1_wks_all on public.schedule_weeks;
create policy p1_wks_all on public.schedule_weeks for all to authenticated
  using (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'))
  with check (public.is_admin() or public.has_role('AREA_MANAGER') or public.has_role('STORE_MANAGER'));

-- ===== logs: chi them moi + doc; cam sua/xoa =====
drop policy if exists p1_admlog_sel on public.admin_logs;
create policy p1_admlog_sel on public.admin_logs for select to authenticated using (public.is_admin());
drop policy if exists p1_admlog_ins on public.admin_logs;
create policy p1_admlog_ins on public.admin_logs for insert to authenticated with check (true);
drop policy if exists p1_actlog_sel on public.activity_logs;
create policy p1_actlog_sel on public.activity_logs for select to authenticated using (true);
drop policy if exists p1_actlog_ins on public.activity_logs;
create policy p1_actlog_ins on public.activity_logs for insert to authenticated with check (true);
drop policy if exists p1_audlog_sel on public.audit_logs;
create policy p1_audlog_sel on public.audit_logs for select to authenticated using (public.is_admin());
drop policy if exists p1_audlog_ins on public.audit_logs;
create policy p1_audlog_ins on public.audit_logs for insert to authenticated with check (true);
drop policy if exists p1_aiconv_sel on public.ai_conversations;
create policy p1_aiconv_sel on public.ai_conversations for select to authenticated using (true);
drop policy if exists p1_aiconv_ins on public.ai_conversations;
create policy p1_aiconv_ins on public.ai_conversations for insert to authenticated with check (true);

-- ===== KIEM TRA =====
select tablename, rowsecurity as rls_on from pg_tables
where schemaname='public' and tablename in ('stores','employees','schedules','feedbacks',
  'shift_swaps','store_shelves','shelf_items','schedule_weeks','attendance',
  'admin_logs','activity_logs','audit_logs','ai_conversations')
order by tablename;
select tablename, count(*) as so_policy from pg_policies
where schemaname='public' group by tablename order by tablename;
