begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-4000-8000-000000000451', 'authenticated', 'authenticated',
   'test-tracking-client@example.test', '', now(), '{"full_name":"TEST - Tracking client"}', now(), now()),
  ('00000000-0000-4000-8000-000000000452', 'authenticated', 'authenticated',
   'test-tracking-other@example.test', '', now(), '{"full_name":"TEST - Other client"}', now(), now()),
  ('00000000-0000-4000-8000-000000000453', 'authenticated', 'authenticated',
   'test-tracking-admin@example.test', '', now(), '{"full_name":"TEST - Tracking admin"}', now(), now());

insert into public.user_roles (user_id, role)
values
  ('00000000-0000-4000-8000-000000000451', 'client'),
  ('00000000-0000-4000-8000-000000000452', 'client'),
  ('00000000-0000-4000-8000-000000000453', 'admin');

insert into public.orders (
  id,
  customer_id,
  status,
  subtotal,
  discount_total,
  delivery_fee,
  service_fee,
  surcharges,
  tip,
  total,
  quote_requested_at,
  quote_expires_at,
  quote_version,
  idempotency_key
)
values
  ('00000000-0000-4000-8000-000000000461', '00000000-0000-4000-8000-000000000451',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now(), null, 0, 'tracking-pending'),
  ('00000000-0000-4000-8000-000000000462', '00000000-0000-4000-8000-000000000451',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now() - interval '121 minutes', null, 0, 'tracking-no-quote'),
  ('00000000-0000-4000-8000-000000000463', '00000000-0000-4000-8000-000000000451',
   'awaiting_customer_confirmation', 10000, 0, 1000, 0, 0, 0, 11000,
   now(), now() - interval '1 minute', 1, 'tracking-expired');

select throws_ok(
  $$select public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000461')$$,
  'P0001',
  'active_client_authentication_required',
  'anonymous callers cannot read a fee quote order'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000451', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000451',
    'role', 'authenticated',
    'aal', 'aal1',
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'password',
      'timestamp', floor(extract(epoch from clock_timestamp()))::bigint
    ))
  )::text,
  true
);

select is(
  public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000461')->>'status',
  'pending_fee_quote',
  'the owner can read an unexpired quote request'
);
select is(
  public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000462')->>'cancel_reason',
  'quote_not_provided',
  'an overdue request is cancelled when its owner reads the tracking screen'
);
select is(
  public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000463')->>'cancel_reason',
  'quote_expired',
  'an expired quote is cancelled when its owner reads the tracking screen'
);
select throws_ok(
  $$select public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000461')$$,
  'P0001',
  'order_not_found',
  'a different customer cannot read the order'
);
select is(
  (select count(*) from public.audit_logs
   where entity = 'orders'
     and entity_id in (
       '00000000-0000-4000-8000-000000000462',
       '00000000-0000-4000-8000-000000000463'
     )
     and action in ('order.quote_not_provided', 'order.quote_expired')),
  2::bigint,
  'lazy cancellation writes an audit entry for each order'
);
update public.order_flow_config
set no_quote_timeout_seconds = null
where singleton;
select throws_ok(
  $$select public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000461')$$,
  'P0001',
  'order_flow_not_configured',
  'missing timeout configuration fails closed'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000453', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000453',
    'role', 'authenticated',
    'aal', 'aal2',
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'totp',
      'timestamp', floor(extract(epoch from clock_timestamp()))::bigint
    ))
  )::text,
  true
);
select throws_ok(
  $$select public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000461')$$,
  'P0001',
  'active_client_authentication_required',
  'an admin cannot use the customer tracking read function'
);

select * from finish();
rollback;
