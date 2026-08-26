-- ==============================================================================
-- OFC PHASE 4b - CREDENTIALS: đóng P0-2 (mật khẩu suy diễn)
--   app_profiles.credential_set_at : NULL = vẫn dùng mật khẩu mặc định (ép đổi)
--   RPC get_credential_state / mark_credential_set (security definer)
-- Idempotent.
-- ==============================================================================
alter table public.app_profiles add column if not exists credential_set_at timestamptz;

create or replace function public.get_credential_state()
returns table (credential_set_at timestamptz, emp_id text)
language sql stable security definer set search_path = public as $$
  select p.credential_set_at, p.emp_id from public.app_profiles p where p.id = auth.uid();
$$;

create or replace function public.mark_credential_set()
returns void
language sql security definer set search_path = public as $$
  update public.app_profiles set credential_set_at = now() where id = auth.uid();
$$;

grant execute on function public.get_credential_state(), public.mark_credential_set() to authenticated;
