drop function public.suspend_account_and_revoke_sessions(uuid);

create function public.suspend_account_and_revoke_sessions(
  target_user_id uuid,
  actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;
  if target_user_id is null or actor_user_id is null then
    raise exception 'Target and actor are required.';
  end if;
  if target_user_id = actor_user_id then
    raise exception 'Administrators cannot suspend their own account.';
  end if;

  select status
    into previous_status
    from public.profiles
    where id = target_user_id
    for update;

  if not found then
    raise exception 'Account not found.';
  end if;

  update public.profiles
  set status = 'suspended'
  where id = target_user_id;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
  values (
    actor_user_id,
    'account.suspend',
    'profiles',
    target_user_id::text,
    jsonb_build_object('status', previous_status),
    jsonb_build_object('status', 'suspended')
  );

  delete from auth.sessions
  where user_id = target_user_id;
end;
$$;

revoke all on function public.suspend_account_and_revoke_sessions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.suspend_account_and_revoke_sessions(uuid, uuid) to service_role;
