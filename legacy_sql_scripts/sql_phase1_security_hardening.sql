-- ==============================================================================
-- BẢN VÁ AN NINH BẢO MẬT GIAI ĐOẠN 1 (PHASE 1 SECURITY HARDENING)
-- Khắc phục các lỗ hổng:
--   * [SEC-03] Chặn leo quyền Admin qua user_metadata trong current_emp_id()
--   * [SEC-06] Chặn Cross-Store IDOR: Ràng buộc phạm vi chi nhánh (dept_in_scope) cho SM
--   * [SEC-07] Khóa cứng ca làm việc tại CSDL khi tuần đã được duyệt (status = 'approved')
-- ==============================================================================

-- 1. [SEC-03] Hàm current_emp_id: CHỈ lấy từ app_profiles nội bộ, không đọc từ user_metadata
create or replace function public.current_emp_id() returns text
language sql stable security definer set search_path = public as $$
  select p.emp_id from public.app_profiles p where p.id = auth.uid();
$$;

-- 2. [SEC-06] Siết chặt RLS policies cho bảng attendance (chỉ SM quản lý cửa hàng đó mới được chấm công)
drop policy if exists p1_att_ins on public.attendance;
create policy p1_att_ins on public.attendance for insert to authenticated
  with check (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (
      public.has_role('STORE_MANAGER')
      and exists(
        select 1 from public.employees e
        where e.id = attendance.emp_id and public.dept_in_scope(e.dept)
      )
    )
  );

drop policy if exists p1_att_upd on public.attendance;
create policy p1_att_upd on public.attendance for update to authenticated
  using (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (
      public.has_role('STORE_MANAGER')
      and exists(
        select 1 from public.employees e
        where e.id = attendance.emp_id and public.dept_in_scope(e.dept)
      )
    )
  )
  with check (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (
      public.has_role('STORE_MANAGER')
      and exists(
        select 1 from public.employees e
        where e.id = attendance.emp_id and public.dept_in_scope(e.dept)
      )
    )
  );

-- 3. [SEC-06] Siết chặt RLS policies cho bảng feedbacks: SM chỉ duyệt đơn thuộc cửa hàng mình
drop policy if exists p1_fb_upd on public.feedbacks;
create policy p1_fb_upd on public.feedbacks for update to authenticated
  using (
    (
      public.is_admin()
      or public.has_role('AREA_MANAGER')
      or (public.has_role('STORE_MANAGER') and public.dept_in_scope(dept))
    )
    and emp_id <> public.current_emp_id()
  )
  with check (emp_id <> public.current_emp_id());

-- 4. [SEC-06] Siết chặt RLS policies cho kệ hàng (store_shelves & shelf_items): SM chỉ sửa kệ thuộc CH mình
drop policy if exists p1_shv_all on public.store_shelves;
create policy p1_shv_all on public.store_shelves for all to authenticated
  using (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (public.has_role('STORE_MANAGER') and store_id in (select public.my_managed_stores()))
  )
  with check (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (public.has_role('STORE_MANAGER') and store_id in (select public.my_managed_stores()))
  );

drop policy if exists p1_shi_all on public.shelf_items;
create policy p1_shi_all on public.shelf_items for all to authenticated
  using (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (public.has_role('STORE_MANAGER') and store_id in (select public.my_managed_stores()))
  )
  with check (
    public.is_admin()
    or public.has_role('AREA_MANAGER')
    or (public.has_role('STORE_MANAGER') and store_id in (select public.my_managed_stores()))
  );

-- 5. [SEC-07] Khóa lịch tuần đã duyệt ở tầng CSDL
create or replace function public.check_schedule_week_locked()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_admin boolean;
  v_status text;
  v_store_id text;
begin
  select public.is_admin() into v_is_admin;
  if v_is_admin then
    return coalesce(new, old);
  end if;

  select e.dept into v_store_id
  from public.employees e
  where e.id = coalesce(new.emp_id, old.emp_id);

  if v_store_id is not null then
    select sw.status into v_status
    from public.schedule_weeks sw
    where sw.store_id = v_store_id
      and sw.week_date = coalesce(new.week_date, old.week_date);

    if v_status = 'approved' then
      raise exception 'WEEK_LOCKED: Tuần làm việc đã được duyệt chính thức (approved). Không thể sửa ô ca trực tiếp.'
        using errcode = '42501';
    end if;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists trg_schedules_lock on public.schedules;
create trigger trg_schedules_lock
  before insert or update or delete on public.schedules
  for each row execute function public.check_schedule_week_locked();
