begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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
  ('00000000-0000-4000-8000-000000000601', 'authenticated', 'authenticated',
   'test-fee-rls-customer@example.test', '', now(), '{"full_name":"TEST - RLS customer"}', now(), now()),
  ('00000000-0000-4000-8000-000000000602', 'authenticated', 'authenticated',
   'test-fee-rls-other@example.test', '', now(), '{"full_name":"TEST - RLS other"}', now(), now()),
  ('00000000-0000-4000-8000-000000000603', 'authenticated', 'authenticated',
   'test-fee-rls-partner@example.test', '', now(), '{"full_name":"TEST - RLS partner"}', now(), now()),
  ('00000000-0000-4000-8000-000000000604', 'authenticated', 'authenticated',
   'test-fee-rls-agent@example.test', '', now(), '{"full_name":"TEST - RLS agent"}', now(), now()),
  ('00000000-0000-4000-8000-000000000605', 'authenticated', 'authenticated',
   'test-fee-rls-courier@example.test', '', now(), '{"full_name":"TEST - RLS courier"}', now(), now()),
  ('00000000-0000-4000-8000-000000000606', 'authenticated', 'authenticated',
   'test-fee-rls-admin@example.test', '', now(), '{"full_name":"TEST - RLS admin"}', now(), now()),
  ('00000000-0000-4000-8000-000000000607', 'authenticated', 'authenticated',
   'test-fee-rls-suspended@example.test', '', now(), '{"full_name":"TEST - RLS suspended"}', now(), now());

insert into public.user_roles (user_id, role)
values
  ('00000000-0000-4000-8000-000000000603', 'partner'),
  ('00000000-0000-4000-8000-000000000604', 'zone_agent'),
  ('00000000-0000-4000-8000-000000000605', 'courier'),
  ('00000000-0000-4000-8000-000000000606', 'admin');

update public.profiles
set status = 'suspended'
where id = '00000000-0000-4000-8000-000000000607';

insert into public.partners (id, slug, type, name)
values (
  '00000000-0000-4000-8000-000000000611',
  'test-fee-rls-shop',
  'restaurant',
  'TEST - RLS Shop'
);

insert into public.partner_members (partner_id, user_id)
values (
  '00000000-0000-4000-8000-000000000611',
  '00000000-0000-4000-8000-000000000603'
);

insert into public.orders (
  id,
  customer_id,
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
  quote_version,
  idempotency_key
)
values (
  '00000000-0000-4000-8000-000000000621',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000611',
  'pending_fee_quote',
  10000,
  0,
  null,
  0,
  0,
  0,
  10000,
  now(),
  null,
  0,
  'test-fee-rls-order'
);

insert into public.orders (
  id,
  customer_id,
  partner_id,
  status,
  subtotal,
  discount_total,
  delivery_fee,
  service_fee,
  surcharges,
  tip,
  total,
  idempotency_key
)
values (
  '00000000-0000-4000-8000-000000000622',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000611',
  'accepted',
  10000,
  0,
  0,
  0,
  0,
  0,
  10000,
  'test-fee-rls-legacy-order'
);

insert into public.order_items (
  id,
  order_id,
  partner_id,
  name_snapshot,
  unit_price,
  qty,
  options,
  line_total
)
values (
  '00000000-0000-4000-8000-000000000631',
  '00000000-0000-4000-8000-000000000621',
  '00000000-0000-4000-8000-000000000611',
  'TEST - RLS Item',
  10000,
  1,
  '[]'::jsonb,
  10000
),
(
  '00000000-0000-4000-8000-000000000632',
  '00000000-0000-4000-8000-000000000622',
  '00000000-0000-4000-8000-000000000611',
  'TEST - Legacy RLS Item',
  10000,
  1,
  '[]'::jsonb,
  10000
);

insert into public.couriers (user_id, is_active)
values ('00000000-0000-4000-8000-000000000602', true);

insert into public.deliveries (id, order_id, courier_id)
values (
  '00000000-0000-4000-8000-000000000641',
  '00000000-0000-4000-8000-000000000621',
  '00000000-0000-4000-8000-000000000602'
);

insert into public.order_status_history (order_id, status, changed_by, reason)
values
(
  '00000000-0000-4000-8000-000000000621',
  'pending_fee_quote',
  '00000000-0000-4000-8000-000000000601',
  'TEST - customer_submission'
),
(
  '00000000-0000-4000-8000-000000000622',
  'accepted',
  '00000000-0000-4000-8000-000000000601',
  'TEST - legacy_acceptance'
);

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000601', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000621'),
  1::bigint,
  'the active customer can read their own quote order'
);
select is(
  (select count(*) from public.order_items where order_id = '00000000-0000-4000-8000-000000000621'),
  1::bigint,
  'the active customer can read their own quote items'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000602', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000602","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'another customer cannot read the quote order'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000603', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000603","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'a partner cannot read a quote order before client acceptance'
);
select is(
  (select count(*) from public.order_items where order_id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'a partner cannot read quote items before client acceptance'
);
select is(
  (select count(*) from public.order_status_history where order_id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'a partner cannot read quote history before client acceptance'
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000622'),
  1::bigint,
  'legacy partner access remains available for non-quote orders'
);
select is(
  (select count(*) from public.order_items where order_id = '00000000-0000-4000-8000-000000000622'),
  1::bigint,
  'legacy partner item access remains available for non-quote orders'
);
select is(
  (select count(*) from public.order_status_history where order_id = '00000000-0000-4000-8000-000000000622'),
  1::bigint,
  'legacy partner history access remains available for non-quote orders'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000604', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000604","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'a zone agent cannot bypass the audited admin queue'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000605', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000605","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.deliveries where order_id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'a courier without an assignment cannot read a quote delivery'
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'a courier cannot read quote order details directly'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000606', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000606","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'an admin must use the audited queue instead of direct table reads'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000607', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000607","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (select count(*) from public.orders where id = '00000000-0000-4000-8000-000000000621'),
  0::bigint,
  'a suspended customer cannot read a quote order'
);

select * from finish();
rollback;
