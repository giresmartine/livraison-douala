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
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated',
   'test-admin-auth@example.test', '', now(), '{"full_name":"TEST - Admin"}', now(), now()),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated',
   'test-customer-auth@example.test', '', now(), '{"full_name":"TEST - Client"}', now(), now());

insert into public.user_roles (user_id, role)
values ('00000000-0000-4000-8000-000000000101', 'admin');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000101',
    'role', 'authenticated',
    'aal', 'aal2',
    'iat', extract(epoch from clock_timestamp())::bigint,
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'totp',
      'timestamp', extract(epoch from clock_timestamp())::bigint
    ))
  )::text,
  true
);
select ok(public.admin_quote_session_is_recent(), 'recent aal2 AMR is accepted');

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000101',
    'role', 'authenticated',
    'aal', 'aal1',
    'iat', extract(epoch from clock_timestamp())::bigint,
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'password',
      'timestamp', extract(epoch from clock_timestamp())::bigint
    ))
  )::text,
  true
);
select ok(public.admin_quote_session_is_recent(), 'recent aal1 AMR is accepted when MFA is not enrolled');

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000101',
    'role', 'authenticated',
    'aal', 'aal2',
    'iat', extract(epoch from clock_timestamp())::bigint,
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'totp',
      'timestamp', extract(epoch from clock_timestamp())::bigint - 960
    ))
  )::text,
  true
);
select ok(not public.admin_quote_session_is_recent(), '16-minute-old AMR is rejected even with a fresh iat');

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000101',
    'role', 'authenticated',
    'aal', 'aal2',
    'iat', extract(epoch from clock_timestamp())::bigint
  )::text,
  true
);
select ok(not public.admin_quote_session_is_recent(), 'missing AMR is rejected even with a fresh iat');

insert into auth.mfa_factors (
  id,
  user_id,
  factor_type,
  status,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101',
  'totp',
  'verified',
  now(),
  now()
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000101',
    'role', 'authenticated',
    'aal', 'aal1',
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'password',
      'timestamp', extract(epoch from clock_timestamp())::bigint
    ))
  )::text,
  true
);
select ok(not public.admin_quote_session_is_recent(), 'aal1 is rejected for admin quote actions');

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000101',
    'role', 'authenticated',
    'aal', 'aal2',
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'totp',
      'timestamp', extract(epoch from clock_timestamp())::bigint
    ))
  )::text,
  true
);
select ok(public.admin_quote_session_is_recent(), 'recent aal2 AMR is accepted when MFA is enrolled');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000102', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000102',
    'role', 'authenticated',
    'aal', 'aal2',
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'totp',
      'timestamp', extract(epoch from clock_timestamp())::bigint
    ))
  )::text,
  true
);
select ok(not public.admin_quote_session_is_recent(), 'fresh non-admin session is rejected');

delete from public.order_flow_config where singleton;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000101',
    'role', 'authenticated',
    'aal', 'aal2',
    'amr', jsonb_build_array(jsonb_build_object(
      'method', 'totp',
      'timestamp', extract(epoch from clock_timestamp())::bigint
    ))
  )::text,
  true
);
select ok(not public.admin_quote_session_is_recent(), 'missing configuration fails closed');

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
select is(
  (select count(*)::integer from public.order_flow_config where max_delivery_fee_xaf = 5000),
  1,
  'approved XAF limit is stored as configuration, not a zone tariff'
);

select * from finish();
rollback;
