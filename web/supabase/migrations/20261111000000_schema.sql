-- Schéma principal de la plateforme de livraison (Supabase / PostgreSQL 15+)
-- Convention : montants en FCFA (entiers), dates en timestamptz, fuseau d'affichage Africa/Douala.

create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ===== Types =====
create type public.user_role as enum ('client', 'partner', 'courier', 'zone_agent', 'admin');
create type public.partner_type as enum ('restaurant', 'pharmacy', 'depot', 'own_stock', 'supermarket', 'other');
create type public.partner_status as enum ('prospect', 'onboarding', 'active', 'paused', 'closed');
create type public.order_status as enum ('draft', 'pending_payment', 'paid', 'accepted', 'preparing', 'ready', 'courier_assigned', 'picked_up', 'on_the_way', 'delivered', 'failed_delivery', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.payment_method as enum ('mobile_money_mtn', 'mobile_money_orange', 'cash', 'card');
create type public.order_source as enum ('web', 'voice', 'group', 'errand', 'prescription');
create type public.refund_status as enum ('requested', 'approved', 'rejected', 'paid');
create type public.group_status as enum ('open', 'locked', 'launched', 'cancelled');
create type public.voice_status as enum ('received', 'proposed', 'validated', 'rejected');
create type public.prescription_status as enum ('sent', 'validated', 'rejected', 'expired');
create type public.ticket_status as enum ('open', 'pending', 'resolved');
create type public.media_status as enum ('pending', 'approved', 'rejected');

-- ===== Utilitaires =====
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ===== Identité =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  language text not null default 'fr' check (language in ('fr', 'en')),
  is_adult_confirmed boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  scope_id uuid,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, role, scope_id)
);

-- ===== Géographie =====
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_fee integer not null check (delivery_fee >= 0),
  min_order integer not null default 0 check (min_order >= 0),
  night_surcharge integer not null default 0,
  rain_surcharge integer not null default 0,
  guarantee_enabled boolean not null default false,
  geom geography (multipolygon, 4326),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  zone_id uuid references public.zones (id) on delete set null,
  geo geography (point, 4326),
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  neighborhood_id uuid references public.neighborhoods (id),
  landmark text not null,
  details text,
  geo geography (point, 4326),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== Partenaires =====
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type public.partner_type not null,
  name text not null,
  description jsonb not null default '{}'::jsonb,
  cuisine_tags text[] not null default '{}',
  phone text,
  neighborhood_id uuid references public.neighborhoods (id),
  address_text text,
  geo geography (point, 4326),
  delivery_radius_m integer not null default 4000 check (delivery_radius_m > 0),
  avg_prep_minutes integer not null default 15 check (avg_prep_minutes >= 0),
  min_order integer check (min_order >= 0),
  status public.partner_status not null default 'prospect',
  commission_model text not null default 'markup' check (commission_model in ('markup', 'discount', 'percent')),
  commission_value integer not null default 0,
  rating_avg numeric (2, 1),
  rating_count integer not null default 0,
  logo_path text,
  cover_path text,
  is_placeholder boolean not null default false,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_members (
  partner_id uuid not null references public.partners (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (partner_id, user_id)
);

-- weekday : 0 = dimanche ... 6 = samedi. Si closes_at <= opens_at, la plage se termine le lendemain.
create table public.partner_hours (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  last_order_before_close integer not null default 30 check (last_order_before_close >= 0)
);

create table public.partner_closures (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

-- ===== Catalogue =====
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  icon text,
  sort integer not null default 0
);

create table public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  name jsonb not null,
  sort integer not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  section_id uuid references public.menu_sections (id) on delete set null,
  category_id uuid references public.categories (id),
  slug text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price >= 0),
  is_available boolean not null default true,
  is_popular boolean not null default false,
  requires_age_check boolean not null default false,
  is_medicine boolean not null default false,
  prep_minutes integer,
  image_path text,
  is_placeholder boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, slug)
);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name jsonb not null,
  min_select integer not null default 0,
  max_select integer not null default 1,
  sort integer not null default 0,
  check (max_select >= min_select)
);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  name jsonb not null,
  price_delta integer not null default 0,
  is_available boolean not null default true,
  sort integer not null default 0
);

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price integer not null check (price >= 0),
  guarantee_eligible boolean not null default false,
  single_stop boolean not null default true,
  image_path text,
  active boolean not null default true
);

create table public.pack_items (
  pack_id uuid not null references public.packs (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty integer not null default 1 check (qty > 0),
  primary key (pack_id, product_id)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('partner_logo', 'partner_cover', 'product', 'pack', 'banner')),
  owner_id uuid not null,
  path text not null,
  width integer,
  height integer,
  blurhash text,
  alt jsonb not null default '{}'::jsonb,
  status public.media_status not null default 'pending',
  uploaded_by uuid references public.profiles (id),
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  kind text not null check (kind in ('percent', 'amount', 'free_delivery', 'bogo')),
  value integer not null default 0,
  min_order integer not null default 0,
  partner_id uuid references public.partners (id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true
);

-- ===== Commandes =====
create table public.group_orders (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id),
  partner_id uuid references public.partners (id),
  deadline timestamptz not null,
  status public.group_status not null default 'open',
  link_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.group_orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  share_amount integer not null default 0 check (share_amount >= 0),
  paid boolean not null default false,
  primary key (group_id, user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity,
  customer_id uuid not null references public.profiles (id),
  address_id uuid references public.addresses (id),
  zone_id uuid references public.zones (id),
  partner_id uuid references public.partners (id),
  status public.order_status not null default 'draft',
  source public.order_source not null default 'web',
  subtotal integer not null default 0 check (subtotal >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  surcharges integer not null default 0 check (surcharges >= 0),
  service_fee integer not null default 0 check (service_fee >= 0),
  tip integer not null default 0 check (tip >= 0),
  total integer not null default 0 check (total >= 0),
  payment_method public.payment_method,
  guarantee_deadline timestamptz,
  group_order_id uuid references public.group_orders (id),
  delivery_option text not null default 'standard' check (delivery_option in ('standard', 'priority', 'scheduled')),
  scheduled_for timestamptz,
  courier_note text,
  idempotency_key text unique,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_secrets (
  order_id uuid primary key references public.orders (id) on delete cascade,
  handover_code text not null,
  handover_attempts integer not null default 0
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  partner_id uuid references public.partners (id),
  name_snapshot text not null,
  unit_price integer not null check (unit_price >= 0),
  qty integer not null check (qty > 0),
  options jsonb not null default '[]'::jsonb,
  line_total integer not null check (line_total >= 0)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles (id),
  reason text,
  created_at timestamptz not null default now()
);

create table public.order_transitions (
  from_status public.order_status not null,
  to_status public.order_status not null,
  role public.user_role not null,
  primary key (from_status, to_status, role)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  provider text not null,
  provider_ref text,
  method public.payment_method not null,
  amount integer not null check (amount >= 0),
  status public.payment_status not null default 'pending',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload jsonb not null,
  verified boolean not null default false,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  amount integer not null check (amount > 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  requested_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.couriers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  zone_id uuid references public.zones (id),
  vehicle text,
  is_active boolean not null default true,
  id_verified boolean not null default false,
  current_geo geography (point, 4326),
  last_seen_at timestamptz
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  courier_id uuid references public.couriers (user_id),
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  cash_collected integer not null default 0 check (cash_collected >= 0)
);

create table public.voice_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  transcript text,
  proposal jsonb,
  confidence numeric (4, 3),
  status public.voice_status not null default 'received',
  validated_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.partners (id),
  file_path text not null,
  status public.prescription_status not null default 'sent',
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create table public.errands (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  description text not null,
  estimate integer not null check (estimate >= 0),
  cap integer not null check (cap > 0),
  actual_amount integer check (actual_amount >= 0),
  receipt_path text,
  item_photo_path text
);

-- ===== Relation client =====
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  tags text[] not null default '{}',
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null,
  reason text not null,
  order_id uuid references public.orders (id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('push', 'whatsapp', 'email')),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id),
  subject text not null,
  message text not null,
  status public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ===== Index =====
create index idx_addresses_user on public.addresses (user_id);
create index idx_neighborhoods_zone on public.neighborhoods (zone_id);
create index idx_zones_geom on public.zones using gist (geom);
create index idx_partners_geo on public.partners using gist (geo);
create index idx_partners_status_type on public.partners (status, type);
create index idx_partners_name_trgm on public.partners using gin (name gin_trgm_ops);
create index idx_partner_hours_partner on public.partner_hours (partner_id, weekday);
create index idx_closures_partner on public.partner_closures (partner_id, starts_at);
create index idx_sections_partner on public.menu_sections (partner_id, sort);
create index idx_products_partner on public.products (partner_id, is_available);
create index idx_products_name_trgm on public.products using gin ((name ->> 'fr') gin_trgm_ops);
create index idx_options_group on public.options (group_id);
create index idx_orders_customer on public.orders (customer_id, created_at desc);
create index idx_orders_status_zone on public.orders (status, zone_id);
create index idx_orders_partner on public.orders (partner_id, created_at desc);
create index idx_order_items_order on public.order_items (order_id);
create index idx_order_items_partner on public.order_items (partner_id);
create index idx_history_order on public.order_status_history (order_id, created_at);
create index idx_payments_order on public.payments (order_id);
create index idx_deliveries_courier on public.deliveries (courier_id);
create index idx_reviews_partner on public.reviews (partner_id, created_at desc);
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_prescriptions_expiry on public.prescriptions (expires_at) where status <> 'expired';
create index idx_tickets_status on public.support_tickets (status, created_at desc);
create index idx_audit_entity on public.audit_logs (entity, entity_id);

-- ===== updated_at =====
do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
    group by table_name
  loop
    execute format('create trigger trg_%s_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
