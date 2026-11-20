-- Authenticated users can only read their own profile and role assignments.
-- All application tables are closed by default until table-specific policies are added.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.zones enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.addresses enable row level security;
alter table public.partners enable row level security;
alter table public.partner_members enable row level security;
alter table public.partner_hours enable row level security;
alter table public.partner_closures enable row level security;
alter table public.categories enable row level security;
alter table public.menu_sections enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.packs enable row level security;
alter table public.pack_items enable row level security;
alter table public.media enable row level security;
alter table public.promotions enable row level security;
alter table public.group_orders enable row level security;
alter table public.group_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_secrets enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_transitions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.couriers enable row level security;
alter table public.deliveries enable row level security;
alter table public.voice_requests enable row level security;
alter table public.prescriptions enable row level security;
alter table public.errands enable row level security;
alter table public.reviews enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, language) on table public.profiles to authenticated;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can update allowed fields on their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users can read their own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_language text;
begin
  requested_language := case
    when new.raw_user_meta_data ->> 'language' = 'en' then 'en'
    else 'fr'
  end;

  insert into public.profiles (id, full_name, phone, language, is_adult_confirmed)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30), ''),
    requested_language,
    coalesce(new.raw_user_meta_data ->> 'is_adult_confirmed', 'false') = 'true'
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'client');

  if coalesce(new.raw_user_meta_data ->> 'legal_accepted', 'false') = 'true' then
    if nullif(new.raw_user_meta_data ->> 'terms_version', '') is null
      or nullif(new.raw_user_meta_data ->> 'privacy_version', '') is null then
      raise exception 'Legal document versions are required for account creation.';
    end if;

    insert into public.legal_acceptances (user_id, document, version)
    values
      (new.id, 'terms', left(new.raw_user_meta_data ->> 'terms_version', 40)),
      (new.id, 'privacy', left(new.raw_user_meta_data ->> 'privacy_version', 40));
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
