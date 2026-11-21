begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

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
  ('00000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated',
   'test-admin-quote@example.test', '', now(), '{"full_name":"TEST - Admin"}', now(), now()),
  ('00000000-0000-4000-8000-000000000302', 'authenticated', 'authenticated',
   'test-client-quote@example.test', '', now(), '{"full_name":"TEST - Client"}', now(), now());

insert into public.user_roles (user_id, role)
values ('00000000-0000-4000-8000-000000000301', 'admin');

insert into auth.mfa_factors (
  id,
  user_id,
  factor_type,
  status,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000301',
  'totp',
  'verified',
  now(),
  now()
);

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
  ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000302',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now(), null, 0, 'quote-action-1'),
  ('00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000302',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now(), null, 0, 'quote-action-2'),
  ('00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000302',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now() - interval '121 minutes', null, 0, 'quote-action-3'),
  ('00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-000000000302',
   'pending_fee_quote', 10000, 0, null, 0, 0, 0, 10000, now(), null, 0, 'quote-action-4'),
  ('00000000-0000-4000-8000-000000000315', '00000000-0000-4000-8000-000000000302',
   'awaiting_customer_confirmation', 10000, 0, 2500, 0, 0, 0, 12500,
   now(), now() - interval '1 minute', 1, 'quote-action-5');

insert into public.order_fee_quotes (
  order_id,
  version,
  delivery_fee,
  subtotal_snapshot,
  discount_total_snapshot,
  total,
  sent_by,
  sent_at,
  expires_at
)
values (
  '00000000-0000-4000-8000-000000000315',
  1,
  2500,
  10000,
  0,
  12500,
  '00000000-0000-4000-8000-000000000301',
  now() - interval '31 minutes',
  now() - interval '1 minute'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000302', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000302',
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
  $$select public.send_order_fee_quote('00000000-0000-4000-8000-000000000311', 2500)$$,
  'P0001',
  'admin_required',
  'a client cannot send a fee quote'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000301', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000301',
    'role', 'authenticated',
    'aal', 'aal2',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'totp',
      'timestamp', floor(extract(epoch from clock_timestamp()))::bigint
    ))
  )::text,
  true
);
select ok(
  public.admin_quote_session_is_recent(),
  'fresh aal2 session for an MFA-enrolled admin passes the session gate'
);
select is(
  public.send_order_fee_quote('00000000-0000-4000-8000-000000000311', 2500),
  'quote_sent',
  'a fresh admin session sends the quote'
);
select is(
  (select quote_version from public.orders where id = '00000000-0000-4000-8000-000000000311'),
  1,
  'the quote version starts at one'
);
select is(
  (select delivery_fee from public.orders where id = '00000000-0000-4000-8000-000000000311'),
  2500,
  'the server stores the admin fee'
);
select ok(
  abs(extract(epoch from (
    (select quote_expires_at from public.orders where id = '00000000-0000-4000-8000-000000000311')
    - (select sent_at from public.order_fee_quotes where order_id = '00000000-0000-4000-8000-000000000311')
  )) - 1800) < 2,
  'the 30-minute expiration starts when the quote is sent'
);
select throws_ok(
  $$select public.send_order_fee_quote('00000000-0000-4000-8000-000000000311', 2500)$$,
  'P0001',
  'order_not_quoteable',
  'a sent quote cannot be edited or sent twice'
);
select throws_ok(
  $$select public.send_order_fee_quote('00000000-0000-4000-8000-000000000312', 5001)$$,
  'P0001',
  'delivery_fee_out_of_limit',
  'fees above the configured cap are rejected'
);
select is(
  public.send_order_fee_quote('00000000-0000-4000-8000-000000000313', 2500),
  'cancelled_quote_not_provided',
  'an unquoted order older than the configured delay is cancelled'
);
select throws_ok(
  $$select public.transition_order('00000000-0000-4000-8000-000000000312', 'awaiting_customer_confirmation')$$,
  'P0001',
  'fee_quote_specific_action_required',
  'generic order transitions cannot bypass the fee quote action'
);
select is(
  public.cancel_order_fee_quote('00000000-0000-4000-8000-000000000311'),
  'quote_replaced',
  'an admin can cancel a sent quote to prepare a replacement'
);
select is(
  public.send_order_fee_quote('00000000-0000-4000-8000-000000000311', 3000),
  'quote_reissued',
  'an admin can reissue a cancelled quote as a new version'
);
select is(
  (select quote_version from public.orders where id = '00000000-0000-4000-8000-000000000311'),
  2,
  'reissued quotes increment the version while preserving history'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000302', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000302',
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
  public.accept_order_fee_quote('00000000-0000-4000-8000-000000000315', 12500, 1),
  false,
  'the database cancels expired quotes when the customer accepts'
);
select is(
  (select cancel_reason from public.orders where id = '00000000-0000-4000-8000-000000000315'),
  'quote_expired',
  'expired quotes receive the explicit cancellation reason'
);

select * from finish();
rollback;
