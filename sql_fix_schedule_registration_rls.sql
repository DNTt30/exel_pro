-- ==============================================================================
-- GS25 OFC SCHEDULE APP - FIX SCHEDULE REGISTRATION RLS & HELPER
-- 1. Nâng cấp current_emp_id(): đọc thêm từ JWT user_metadata nếu bảng app_profiles trễ.
-- 2. Sửa policy p1_sch_all trên bảng schedules:
--    - Cho phép nhân viên tự lưu/sửa lịch làm của chính mình (emp_id = current_emp_id()).
--    - Cho phép Store Manager quản lý nhân viên thuộc cửa hàng của mình (dept_in_scope).
--    - Cho phép Area Manager (AM) và Admin toàn quyền.
--    - Sửa mệnh đề USING để SM/Employee cũng có quyền UPDATE/DELETE ca của mình/cửa hàng mình.
-- 3. Tạo RPC save_employee_schedule (SECURITY DEFINER) làm fallback dự phòng.
-- ==============================================================================

-- 1. Cập nhật current_emp_id()
create or replace function public.current_emp_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.emp_id from public.app_profiles p where p.id = auth.uid()),
    auth.jwt() -> 'user_metadata' ->> 'emp_id',
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'emp_id', '')
  );
$$;

-- 2. Cập nhật RLS policy trên bảng schedules
drop policy if exists p1_sch_all on public.schedules;
create policy p1_sch_all on public.schedules for all to authenticated
  using (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or schedules.emp_id = public.current_emp_id()
    or (public.has_role('STORE_MANAGER') and exists(
          select 1 from public.employees e
          where e.id = schedules.emp_id and public.dept_in_scope(e.dept)))
  )
  with check (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or schedules.emp_id = public.current_emp_id()
    or (public.has_role('STORE_MANAGER') and exists(
          select 1 from public.employees e
          where e.id = schedules.emp_id and public.dept_in_scope(e.dept)))
  );

-- Đảm bảo quyền SELECT cho authenticated và anon
drop policy if exists p1_sch_sel on public.schedules;
create policy p1_sch_sel on public.schedules for select to authenticated using (true);

drop policy if exists p1_sch_sel_anon on public.schedules;
create policy p1_sch_sel_anon on public.schedules for select to anon using (true);

-- 3. Tạo RPC save_employee_schedule làm kênh dự phòng an toàn
create or replace function public.save_employee_schedule(
  p_week_date text,
  p_emp_id text,
  p_shifts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.current_emp_id();
  v_is_mgr boolean := public.is_admin() or public.has_role('AREA_MANAGER');
begin
  -- Kiểm tra quyền: phải là chính nhân viên đó, hoặc SM quản lý cửa hàng đó, hoặc AM/Admin
  if not v_is_mgr and coalesce(v_caller, '') <> p_emp_id then
    if not (public.has_role('STORE_MANAGER') and exists(
      select 1 from public.employees e
      where e.id = p_emp_id and public.dept_in_scope(e.dept)
    )) then
      raise exception 'Unauthorized to edit schedule for employee % (caller: %)', p_emp_id, coalesce(v_caller, 'none');
    end if;
  end if;

  insert into public.schedules (week_date, emp_id, shifts, updated_at, updated_by)
  values (p_week_date, p_emp_id, p_shifts, now(), coalesce(v_caller, p_emp_id))
  on conflict (week_date, emp_id)
  do update set
    shifts = excluded.shifts,
    updated_at = now(),
    updated_by = coalesce(v_caller, p_emp_id);

  return jsonb_build_object('success', true, 'emp_id', p_emp_id, 'week_date', p_week_date);
end;
$$;

grant execute on function public.save_employee_schedule(text, text, jsonb) to authenticated;
grant execute on function public.save_employee_schedule(text, text, jsonb) to anon;
