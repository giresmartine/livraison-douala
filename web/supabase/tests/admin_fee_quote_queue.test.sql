begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

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
  ('00000000-0000-4000-8000-000000000501', 'authenticated', 'authenticated',
   'test-admin-queue@example.test', '', now(), '{"full_name":"TEST - Queue admin"}', now(), now()),
  ('00000000-0000-4000-8000-000000000502', 'authenticated', 'authenticated',
   'test-client-queue@example.test', '', now(), '{"full_name":"TEST - Queue client"}', now(), now());

insert into public.user_roles (user_id, role)
values ('00000000-0000-4000-8000-000000000501', 'admin');

insert into public.partners (id, slug, type, name)
values (
  '00000000-0000-4000-8000-000000000511',
  'test-queue-shop',
  'restaurant',
  'TEST - Shop'
);

insert into public.addresses (id, user_id, label, landmark, details)
values (
  '00000000-0000-4000-8000-000000000521',
  '00000000-0000-4000-8000-000000000502',
  'TEST - Quartier',
  'TEST - Repère',
  'TEST - Instructions'
);

insert into public.orders (
  id,
  customer_id,
  address_id,
  partner_id,
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
  ('00000000-0000-4000-8000-000000000531', '00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000511',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now(), null, null, 0, null, 'admin-queue-pending'),
  ('00000000-0000-4000-8000-000000000532', '00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000511',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000,
   now() - interval '121 minutes', null, null, 0, null, 'admin-queue-overdue'),
  ('00000000-0000-4000-8000-000000000533', '00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000511',
   'cancelled', 10000, 0, 800, 0, 0, 0, 10800,
   now() - interval '5 minutes', now() + interval '25 minutes',
   now() - interval '5 minutes', 1, 'quote_replaced', 'admin-queue-reissue'),
  ('00000000-0000-4000-8000-000000000534', '00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000511',
   'awaiting_customer_confirmation', 10000, 0, 1000, 0, 0, 0, 11000,
   now() - interval '31 minutes', now() - interval '1 minute', null, 1, null, 'admin-queue-expired'),
  ('00000000-0000-4000-8000-000000000535', '00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000511',
   'awaiting_customer_confirmation', 10000, 0, 1200, 0, 0, 0, 11200,
   now() - interval '3 minutes', now() + interval '27 minutes', null, 1, null, 'admin-queue-awaiting'),
  ('00000000-0000-4000-8000-000000000536', '00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000511',
   'cancelled', 10000, 0, 800, 0, 0, 0, 10800,
   now() - interval '130 minutes', now() - interval '100 minutes',
   now() - interval '121 minutes', 1, 'quote_replaced', 'admin-queue-expired-reissue');

insert into public.order_items (
  id, order_id, partner_id, name_snapshot, unit_price, qty, options, line_total
)
values (
  '00000000-0000-4000-8000-000000000541',
  '00000000-0000-4000-8000-000000000531',
  '00000000-0000-4000-8000-000000000511',
  'TEST - Item',
  10000,
  1,
  '[]'::jsonb,
  10000
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000502', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000502',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
select throws_ok(
  $$select public.get_admin_fee_quote_queue()$$,
  'P0001',
  'admin_required',
  'a customer cannot read the admin quote queue'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000501', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000501',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
create temporary table admin_queue_result (payload jsonb);
insert into admin_queue_result
select public.get_admin_fee_quote_queue();

select is(
  jsonb_array_length((select payload -> 'orders' from admin_queue_result)),
  3,
  'the admin queue contains pending, sent, and reissue quotes after applying timeouts'
);
select ok(
  not ((select payload -> 'orders' -> 0 from admin_queue_result) ? 'customer_id')
  and not ((select payload -> 'orders' -> 0 from admin_queue_result) ? 'phone'),
  'the queue omits customer identifiers and phone numbers'
);
select is(
  (select payload #>> '{orders,0,delivery_address,details}' from admin_queue_result),
  'TEST - Instructions',
  'the admin receives the address detail needed to process the quote'
);
select is(
  (select count(*) from public.audit_logs
   where action = 'admin.order_fee_quote.read'
     and entity = 'orders'
     and entity_id in (
       '00000000-0000-4000-8000-000000000531',
       '00000000-0000-4000-8000-000000000533',
       '00000000-0000-4000-8000-000000000535'
     )),
  3::bigint,
  'each order returned by the sensitive admin queue is audited'
);
select is(
  (select cancel_reason from public.orders where id = '00000000-0000-4000-8000-000000000532'),
  'quote_not_provided',
  'the queue lazily cancels requests without a quote after the configured delay'
);
select is(
  (select cancel_reason from public.orders where id = '00000000-0000-4000-8000-000000000534'),
  'quote_expired',
  'the queue lazily cancels expired quotes'
);
select is(
  (select cancel_reason from public.orders where id = '00000000-0000-4000-8000-000000000536'),
  'quote_not_provided',
  'the queue expires a replacement request after its configured waiting duration'
);

delete from public.order_flow_config where singleton;
select throws_ok(
  $$select public.get_admin_fee_quote_queue()$$,
  'P0001',
  'order_flow_not_configured',
  'the queue fails closed when its configuration is absent'
);

select * from finish();
rollback;
