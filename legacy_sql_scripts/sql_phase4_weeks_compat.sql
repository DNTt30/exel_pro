-- ==============================================================================
-- OFC PHASE 4 COMPAT — week-flow dùng 'pending', phase3 dùng 'submitted'
-- Chấp nhận cả hai, mirror dấu duyệt sang cột reviewed_* để UI cũ hiển thị đúng.
-- Idempotent.
-- ==============================================================================
do $$ begin
  alter table public.schedule_weeks drop constraint if exists ck_weeks_status;
  alter table public.schedule_weeks add constraint ck_weeks_status
    check (status in ('draft','pending','submitted','approved','rejected'));
exception when others then raise notice 'ck skip: %', sqlerrm; end $$;

create or replace function public.weeks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor text; is_adm bool; is_am bool; is_sm bool;
begin
  if new.status = old.status then return new; end if;
  -- chuẩn hoá từ vựng cũ/mới
  if new.status = 'submitted' then new.status := 'pending'; end if;
  if old.status = 'submitted' then old.status := 'pending'; end if;
  actor := public.current_emp_id();
  is_adm := public.is_admin(); is_am := public.has_role('AREA_MANAGER'); is_sm := public.has_role('STORE_MANAGER');

  if old.status = 'draft' and new.status = 'pending' then
    if not (is_sm or is_am or is_adm) then raise exception 'PERMISSION_DENIED: chi quan ly duoc trinh tuan'; end if;
    new.submitted_by := actor; new.submitted_at := now();
  elsif old.status = 'pending' and new.status = 'approved' then
    if not (is_am or is_adm) then raise exception 'PERMISSION_DENIED: chi AM/ADMIN duoc duyet'; end if;
    new.approved_by := actor; new.approved_at := now();
    new.reviewed_by := actor; new.reviewed_at := now();       -- mirror cho UI cũ
  elsif old.status = 'pending' and new.status = 'rejected' then
    if not (is_am or is_adm) then raise exception 'PERMISSION_DENIED: chi AM/ADMIN duoc tu choi'; end if;
    new.rejected_by := actor; new.rejected_at := now();
    new.rejection_reason := coalesce(new.rejection_reason,'');
    new.reviewed_by := actor; new.reviewed_at := now();
    new.review_note := coalesce(new.rejection_reason, new.review_note);
  elsif old.status = 'rejected' and new.status = 'draft' then
    if not (is_am or is_adm or new.submitted_by = actor or old.submitted_by = actor)
      then raise exception 'PERMISSION_DENIED'; end if;
    new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
  elsif old.status = 'approved' and new.status = 'draft' then
    if not (is_am or is_adm) then raise exception 'PERMISSION_DENIED: mo lai tuan da duyet chi AM/ADMIN'; end if;
    new.approved_by := null; new.approved_at := null;
    new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
  else
    raise exception 'INVALID_TRANSITION: % -> %', old.status, new.status;
  end if;
  return new;
end $$;
