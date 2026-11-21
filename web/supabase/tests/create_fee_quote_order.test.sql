begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

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
   'test-customer-order@example.test', '', now(), '{"full_name":"TEST - Client A"}', now(), now()),
  ('00000000-0000-4000-8000-000000000502', 'authenticated', 'authenticated',
   'test-customer-order-b@example.test', '', now(), '{"full_name":"TEST - Client B"}', now(), now());

insert into public.addresses (id, user_id, landmark)
values
  ('00000000-0000-4000-8000-000000000511', '00000000-0000-4000-8000-000000000501', 'TEST - Repère client A'),
  ('00000000-0000-4000-8000-000000000512', '00000000-0000-4000-8000-000000000502', 'TEST - Repère client B');

insert into public.partners (
  id,
  slug,
  type,
  name,
  status,
  is_placeholder
)
values
  ('00000000-0000-4000-8000-000000000521', 'test-open-partner', 'restaurant',
   '{"fr":"TEST - Établissement ouvert","en":"TEST - Open partner"}', 'active', false),
  ('00000000-0000-4000-8000-000000000522', 'test-closed-partner', 'restaurant',
   '{"fr":"TEST - Établissement fermé","en":"TEST - Closed partner"}', 'closed', false);

insert into public.partner_hours (partner_id, weekday, opens_at, closes_at, last_order_before_close)
select '00000000-0000-4000-8000-000000000521', weekday, '00:00', '23:59', 0
from generate_series(0, 6) as weekday;

insert into public.products (
  id,
  partner_id,
  slug,
  name,
  price,
  is_available,
  is_medicine,
  is_placeholder
)
values
  ('00000000-0000-4000-8000-000000000531', '00000000-0000-4000-8000-000000000521',
   'test-product', '{"fr":"TEST - Produit","en":"TEST - Product"}', 1500, true, false, false),
  ('00000000-0000-4000-8000-000000000532', '00000000-0000-4000-8000-000000000522',
   'test-closed-product', '{"fr":"TEST - Produit fermé","en":"TEST - Closed product"}', 900, true, false, false);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_fee_quote_order(uuid,uuid,text,text,jsonb)',
    'execute'
  ),
  'authenticated clients cannot bypass the server-only order creation action'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'service_role')::text,
  true
);

create temporary table created_order (id uuid);
insert into created_order
select public.create_fee_quote_order(
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000511',
  'test-idempotency-a',
  'fr',
  '[{"product_id":"00000000-0000-4000-8000-000000000531","qty":2,"unit_price":1,"option_ids":[]}]'::jsonb
);

select is(
  (select subtotal from public.orders where id = (select id from created_order)),
  3000,
  'the database ignores the client price and recalculates subtotal'
);
select is(
  (select unit_price from public.order_items where order_id = (select id from created_order)),
  1500,
  'the persisted item uses the current catalogue price'
);
select ok(
  (select delivery_fee is null from public.orders where id = (select id from created_order)),
  'delivery fee remains NULL before an admin quote'
);

select is(
  public.create_fee_quote_order(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000511',
    'test-idempotency-a',
    'fr',
    '[{"product_id":"00000000-0000-4000-8000-000000000532","qty":1,"option_ids":[]}]'::jsonb
  ),
  (select id from created_order),
  'a duplicate idempotency key returns the existing order'
);
select is(
  (select count(*)::integer from public.orders where customer_id = '00000000-0000-4000-8000-000000000501'),
  1,
  'a duplicate submission does not create another order'
);
select throws_ok(
  $$select public.create_fee_quote_order(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000511',
    'closed-partner',
    'fr',
    '[{"product_id":"00000000-0000-4000-8000-000000000532","qty":1,"option_ids":[]}]'::jsonb
  )$$,
  'P0001',
  'partner_not_orderable',
  'orders from a closed partner are rejected'
);
select throws_ok(
  $$select public.create_fee_quote_order(
    '00000000-0000-4000-8000-000000000999',
    '00000000-0000-4000-8000-000000000511',
    'unknown-customer',
    'fr',
    '[{"product_id":"00000000-0000-4000-8000-000000000531","qty":1,"option_ids":[]}]'::jsonb
  )$$,
  'P0001',
  'active_customer_required',
  'unregistered or unauthenticated customers cannot create orders'
);

insert into public.orders (
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
  idempotency_key
)
select
  '00000000-0000-4000-8000-000000000501',
  'pending_fee_quote',
  0,
  0,
  null,
  0,
  0,
  0,
  0,
  now(),
  'test-pending-' || number
from generate_series(1, 2) as number;

select throws_ok(
  $$select public.create_fee_quote_order(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000511',
    'pending-limit',
    'fr',
    '[{"product_id":"00000000-0000-4000-8000-000000000531","qty":1,"option_ids":[]}]'::jsonb
  )$$,
  'P0001',
  'pending_quote_limit_reached',
  'the configured pending-quote limit is enforced'
);

update public.orders
set status = 'cancelled',
    cancel_reason = 'customer_cancelled'
where customer_id = '00000000-0000-4000-8000-000000000501'
  and status = 'pending_fee_quote';
insert into public.orders (
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
  cancel_reason,
  idempotency_key
)
select
  '00000000-0000-4000-8000-000000000501',
  'cancelled',
  0,
  0,
  null,
  0,
  0,
  0,
  0,
  now(),
  'customer_cancelled',
  'test-rate-limit-' || number
from generate_series(1, 7) as number;
select throws_ok(
  $$select public.create_fee_quote_order(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000511',
    'hourly-limit',
    'fr',
    '[{"product_id":"00000000-0000-4000-8000-000000000531","qty":1,"option_ids":[]}]'::jsonb
  )$$,
  'P0001',
  'submission_rate_limit_reached',
  'the configured hourly submission limit is enforced'
);

select throws_ok(
  $$select public.create_fee_quote_order(
    '00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000511',
    'other-users-address',
    'fr',
    '[{"product_id":"00000000-0000-4000-8000-000000000531","qty":1,"option_ids":[]}]'::jsonb
  )$$,
  'P0001',
  'delivery_address_unavailable',
  'a customer cannot submit another user address'
);

select * from finish();
rollback;
