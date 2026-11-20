create or replace function public.suspend_account_and_revoke_sessions(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  update public.profiles
  set status = 'suspended'
  where id = target_user_id;

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    raise exception 'Account not found.';
  end if;

  delete from auth.sessions
  where user_id = target_user_id;
end;
$$;

revoke all on function public.suspend_account_and_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.suspend_account_and_revoke_sessions(uuid) to service_role;
