create table public.order_flow_config (
  singleton boolean primary key default true check (singleton),
  max_delivery_fee_xaf integer not null check (max_delivery_fee_xaf >= 0),
  quote_expiry_seconds integer not null check (quote_expiry_seconds > 0),
  no_quote_timeout_seconds integer not null check (no_quote_timeout_seconds > 0),
  max_pending_fee_quotes_per_customer integer not null check (max_pending_fee_quotes_per_customer > 0),
  max_order_submissions_per_hour integer not null check (max_order_submissions_per_hour > 0),
  admin_reauth_max_age_seconds integer not null check (admin_reauth_max_age_seconds > 0),
  updated_at timestamptz not null default now()
);

insert into public.order_flow_config (
  singleton,
  max_delivery_fee_xaf,
  quote_expiry_seconds,
  no_quote_timeout_seconds,
  max_pending_fee_quotes_per_customer,
  max_order_submissions_per_hour,
  admin_reauth_max_age_seconds
)
values (true, 5000, 1800, 7200, 3, 10, 900);

alter table public.order_flow_config enable row level security;
revoke all on public.order_flow_config from anon, authenticated;
grant select, update on public.order_flow_config to authenticated;

create policy order_flow_config_admin_read on public.order_flow_config
  for select to authenticated
  using (public.is_active_user() and public.has_role('admin'));

create policy order_flow_config_admin_update on public.order_flow_config
  for update to authenticated
  using (public.is_active_user() and public.has_role('admin'))
  with check (public.is_active_user() and public.has_role('admin'));

create trigger order_flow_config_updated_at
  before update on public.order_flow_config
  for each row execute function public.set_updated_at();

create or replace function public.admin_quote_session_is_recent()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := auth.jwt();
  v_latest_auth numeric;
  v_max_age integer;
  v_mfa_enabled boolean;
begin
  if auth.uid() is null
     or not public.is_active_user()
     or not public.has_role('admin') then
    return false;
  end if;

  select config.admin_reauth_max_age_seconds
    into v_max_age
  from public.order_flow_config config
  where config.singleton;

  if not found or v_max_age is null or v_max_age <= 0 then
    return false;
  end if;

  select exists (
    select 1
    from auth.mfa_factors factor
    where factor.user_id = auth.uid()
      and factor.status = 'verified'
  )
    into v_mfa_enabled;

  if (v_mfa_enabled and v_claims ->> 'aal' is distinct from 'aal2')
     or jsonb_typeof(v_claims -> 'amr') is distinct from 'array' then
    return false;
  end if;

  select max(
    case
      when entry.value ->> 'method' in (
        'password', 'totp', 'otp', 'oauth', 'sso/saml',
        'magiclink', 'email/signup', 'email_change', 'invite', 'recovery'
      )
       and (entry.value ->> 'timestamp') ~ '^[0-9]+([.][0-9]+)?$'
        then (entry.value ->> 'timestamp')::numeric
      else null
    end
  )
    into v_latest_auth
  from jsonb_array_elements(v_claims -> 'amr') as entry(value);

  if v_latest_auth is null
     or v_latest_auth > extract(epoch from clock_timestamp()) then
    return false;
  end if;

  return extract(epoch from clock_timestamp()) - v_latest_auth <= v_max_age;
end;
$$;

revoke all on function public.admin_quote_session_is_recent()
  from public, anon;
grant execute on function public.admin_quote_session_is_recent()
  to authenticated, service_role;
