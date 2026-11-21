begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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
  quote_replacement_requested_at,
  quote_version,
  cancel_reason,
  idempotency_key
)
values
  ('00000000-0000-4000-8000-000000000461', '00000000-0000-4000-8000-000000000451',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now(), null, null, 0, null, 'tracking-pending'),
  ('00000000-0000-4000-8000-000000000462', '00000000-0000-4000-8000-000000000451',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now() - interval '121 minutes', null, null, 0, null, 'tracking-no-quote'),
  ('00000000-0000-4000-8000-000000000463', '00000000-0000-4000-8000-000000000451',
   'awaiting_customer_confirmation', 10000, 0, 1000, 0, 0, 0, 11000,
   now(), now() - interval '1 minute', null, 1, null, 'tracking-expired'),
  ('00000000-0000-4000-8000-000000000464', '00000000-0000-4000-8000-000000000451',
   'cancelled', 10000, 0, 1000, 0, 0, 0, 11000,
   now() - interval '10 minutes', now() + interval '20 minutes',
   now() - interval '5 minutes', 1, 'quote_replaced', 'tracking-replacement-pending'),
  ('00000000-0000-4000-8000-000000000465', '00000000-0000-4000-8000-000000000451',
   'cancelled', 10000, 0, 1000, 0, 0, 0, 11000,
   now() - interval '130 minutes', now() - interval '10 minutes',
   now() - interval '121 minutes', 1, 'quote_replaced', 'tracking-replacement-expired'),
  ('00000000-0000-4000-8000-000000000466', '00000000-0000-4000-8000-000000000451',
   'cancelled', 10000, 0, 1000, 0, 0, 0, 11000,
   now() - interval '130 minutes', now() - interval '10 minutes',
   now() - interval '121 minutes', 1, 'quote_replaced', 'tracking-reissue-expired');

select throws_ok(
  $$update public.orders
    set status = 'awaiting_customer_confirmation'
    where id = '00000000-0000-4000-8000-000000000466'$$,
  'P0001',
  'quote_replacement_expired',
  'the database refuses to reissue a quote after the configured replacement deadline'
);

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
update public.order_flow_config
set no_quote_timeout_seconds = 3600
where singleton;
select is(
  public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000464')->>'cancel_reason',
  'quote_replaced',
  'the customer sees the replacement-waiting state before its deadline'
);
select is(
  (
    public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000464')
      ->> 'quote_replacement_deadline_at'
  )::timestamptz,
  (
    select quote_replacement_requested_at + interval '1 hour'
    from public.orders
    where id = '00000000-0000-4000-8000-000000000464'
  ),
  'the replacement deadline uses the configured waiting duration'
);
select is(
  public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000465')->>'cancel_reason',
  'quote_not_provided',
  'the replacement wait expires after the configured deadline'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000452', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000452',
    'role', 'authenticated',
    'aal', 'aal1',
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'password',
      'timestamp', floor(extract(epoch from clock_timestamp()))::bigint
    ))
  )::text,
  true
);
select throws_ok(
  $$select public.get_customer_fee_quote_order('00000000-0000-4000-8000-000000000461')$$,
  'P0001',
  'order_not_found',
  'a different customer cannot read the order'
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
  (select count(*) from public.audit_logs
   where entity = 'orders'
     and entity_id in (
       '00000000-0000-4000-8000-000000000462',
       '00000000-0000-4000-8000-000000000463',
       '00000000-0000-4000-8000-000000000465'
     )
     and action in ('order.quote_not_provided', 'order.quote_expired')),
  3::bigint,
  'lazy cancellation writes an audit entry for each expired order'
);
delete from public.order_flow_config where singleton;
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
  'order_not_found',
  'an admin cannot read a different customer order through the tracking function'
);

select * from finish();
rollback;
