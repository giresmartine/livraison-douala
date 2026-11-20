begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select ok(
  (
    select count(*) = 3
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'order_status'
      and e.enumlabel in (
        'pending_fee_quote',
        'awaiting_customer_confirmation',
        'quote_accepted'
      )
  ),
  'fee quote statuses are part of the order state machine'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'delivery_fee'
      and is_nullable = 'YES'
  ),
  'delivery fee can remain NULL until a quote is sent'
);

select ok(
  (
    select count(*) = 4
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name in (
        'quote_requested_at',
        'quote_expires_at',
        'quote_version',
        'cancel_reason'
      )
  ),
  'orders persist quote timing, version and cancellation reason'
);

select ok(
  to_regclass('public.order_fee_quotes') is not null,
  'immutable quote history table exists'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.order_fee_quotes'::regclass
  ),
  'quote history has row-level security enabled'
);

select ok(
  not has_table_privilege('authenticated', 'public.order_fee_quotes', 'select')
  and not has_table_privilege('authenticated', 'public.order_fee_quotes', 'insert')
  and not has_table_privilege('authenticated', 'public.order_fee_quotes', 'update')
  and not has_table_privilege('authenticated', 'public.order_fee_quotes', 'delete'),
  'authenticated users cannot read or mutate quote history directly'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_customer_idempotency_key_key'
      and contype = 'u'
  ),
  'idempotency keys are unique per customer'
);

select * from finish();
rollback;
