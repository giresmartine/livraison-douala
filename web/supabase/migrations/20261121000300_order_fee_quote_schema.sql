alter table public.orders
  alter column delivery_fee drop not null;

alter table public.orders
  add column quote_requested_at timestamptz,
  add column quote_expires_at timestamptz,
  add column quote_version integer not null default 0 check (quote_version >= 0),
  add column cancel_reason text
    check (
      cancel_reason is null
      or cancel_reason in (
        'customer_cancelled',
        'quote_declined',
        'quote_expired',
        'quote_not_provided',
        'quote_replaced'
      )
    ),
  add constraint orders_fee_quote_state_check check (
    status not in (
      'pending_fee_quote',
      'awaiting_customer_confirmation',
      'quote_accepted'
    )
    or (
      status = 'pending_fee_quote'
      and delivery_fee is null
      and quote_requested_at is not null
      and quote_expires_at is null
      and quote_version = 0
      and service_fee = 0
      and surcharges = 0
      and tip = 0
    )
    or (
      status in ('awaiting_customer_confirmation', 'quote_accepted')
      and delivery_fee is not null
      and quote_requested_at is not null
      and quote_expires_at is not null
      and quote_version > 0
      and service_fee = 0
      and surcharges = 0
      and tip = 0
      and total = subtotal - discount_total + delivery_fee
    )
  );

alter table public.orders
  drop constraint if exists orders_idempotency_key_key;

alter table public.orders
  add constraint orders_customer_idempotency_key_key
  unique (customer_id, idempotency_key);

create table public.order_fee_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  version integer not null check (version > 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  subtotal_snapshot integer not null check (subtotal_snapshot >= 0),
  discount_total_snapshot integer not null
    check (discount_total_snapshot >= 0 and discount_total_snapshot <= subtotal_snapshot),
  total integer not null check (
    total = subtotal_snapshot - discount_total_snapshot + delivery_fee
  ),
  sent_by uuid not null references public.profiles (id),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (order_id, version),
  check (expires_at > sent_at)
);

create or replace function public.prevent_order_fee_quote_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'order_fee_quote_immutable';
end;
$$;

revoke all on function public.prevent_order_fee_quote_mutation()
  from public, anon, authenticated;

create trigger order_fee_quotes_immutable
  before update or delete on public.order_fee_quotes
  for each row execute function public.prevent_order_fee_quote_mutation();

alter table public.order_fee_quotes enable row level security;
revoke all on table public.order_fee_quotes from anon, authenticated;

create index idx_orders_fee_quote_pending
  on public.orders (quote_requested_at)
  where status = 'pending_fee_quote';

create index idx_orders_fee_quote_expiry
  on public.orders (quote_expires_at)
  where status = 'awaiting_customer_confirmation';

create index idx_order_fee_quotes_order_version
  on public.order_fee_quotes (order_id, version desc);
