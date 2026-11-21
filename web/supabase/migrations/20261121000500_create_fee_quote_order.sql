create or replace function public.create_fee_quote_order(
  p_customer_id uuid,
  p_address_id uuid,
  p_idempotency_key text,
  p_locale text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config public.order_flow_config;
  v_existing_order uuid;
  v_order_id uuid;
  v_partner_id uuid;
  v_partner public.partners;
  v_address public.addresses;
  v_item jsonb;
  v_product public.products;
  v_option_ids jsonb;
  v_option_count integer;
  v_distinct_option_count integer;
  v_valid_option_count integer;
  v_option_delta bigint;
  v_option_snapshots jsonb;
  v_group record;
  v_group_selection_count integer;
  v_qty integer;
  v_unit_price bigint;
  v_line_total bigint;
  v_subtotal bigint := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_now timestamptz := clock_timestamp();
  v_local_time timestamp;
  v_local_weekday integer;
  v_local_minute integer;
  v_open boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'server_only';
  end if;
  if p_customer_id is null
     or p_address_id is null
     or p_idempotency_key is null
     or length(p_idempotency_key) not between 1 and 128
     or p_locale is null
     or p_locale not in ('fr', 'en') then
    raise exception 'invalid_order_request';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_order_items';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_order_items';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    where jsonb_typeof(entry.value) is distinct from 'object'
       or jsonb_typeof(entry.value -> 'product_id') is distinct from 'string'
       or jsonb_typeof(entry.value -> 'qty') is distinct from 'number'
       or (entry.value ->> 'qty') !~ '^[1-9][0-9]*$'
       or length(entry.value ->> 'qty') > 10
       or coalesce(jsonb_typeof(entry.value -> 'option_ids'), 'array') <> 'array'
  ) then
    raise exception 'invalid_order_items';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    where (entry.value ->> 'qty')::numeric > 2147483647
  ) then
    raise exception 'invalid_order_items';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    join public.user_roles role
      on role.user_id = profile.id
     and role.role = 'client'
    where profile.id = p_customer_id
      and profile.status = 'active'
  ) then
    raise exception 'active_customer_required';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_customer_id::text));

  select order_row.id into v_existing_order
  from public.orders order_row
  where order_row.customer_id = p_customer_id
    and order_row.idempotency_key = p_idempotency_key;
  if found then
    return v_existing_order;
  end if;

  select * into v_config
  from public.order_flow_config
  where singleton;
  if not found
     or v_config.max_pending_fee_quotes_per_customer is null
     or v_config.max_order_submissions_per_hour is null then
    raise exception 'order_flow_not_configured';
  end if;

  if (
    select count(*)
    from public.orders order_row
    where order_row.customer_id = p_customer_id
      and order_row.status = 'pending_fee_quote'
  ) >= v_config.max_pending_fee_quotes_per_customer then
    raise exception 'pending_quote_limit_reached';
  end if;
  if (
    select count(*)
    from public.orders order_row
    where order_row.customer_id = p_customer_id
      and order_row.quote_requested_at >= v_now - interval '1 hour'
  ) >= v_config.max_order_submissions_per_hour then
    raise exception 'submission_rate_limit_reached';
  end if;

  select * into v_address
  from public.addresses address_row
  where address_row.id = p_address_id
    and address_row.user_id = p_customer_id;
  if not found or nullif(btrim(v_address.landmark), '') is null then
    raise exception 'delivery_address_unavailable';
  end if;

  for v_item in
    select entry.value
    from jsonb_array_elements(p_items) as entry(value)
  loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty <= 0 then
      raise exception 'invalid_order_items';
    end if;

    select * into v_product
    from public.products product
    where product.id::text = v_item ->> 'product_id'
    for share;
    if not found
       or not v_product.is_available
       or v_product.is_medicine
       or v_product.is_placeholder then
      raise exception 'product_unavailable';
    end if;

    if v_partner_id is null then
      v_partner_id := v_product.partner_id;
    elsif v_partner_id <> v_product.partner_id then
      raise exception 'multi_partner_order_not_allowed';
    end if;

    v_option_ids := coalesce(v_item -> 'option_ids', '[]'::jsonb);
    if exists (
      select 1
      from jsonb_array_elements(v_option_ids) as selected(value)
      where jsonb_typeof(selected.value) is distinct from 'string'
    ) then
      raise exception 'invalid_product_options';
    end if;

    select count(*)::integer, count(distinct selected.value)::integer
      into v_option_count, v_distinct_option_count
    from jsonb_array_elements_text(v_option_ids) as selected(value);
    if v_option_count <> v_distinct_option_count then
      raise exception 'invalid_product_options';
    end if;

    select count(*)::integer
      into v_valid_option_count
    from jsonb_array_elements_text(v_option_ids) as selected(value)
    join public.options option_row
      on option_row.id::text = selected.value
     and option_row.is_available
    join public.option_groups option_group
      on option_group.id = option_row.group_id
     and option_group.product_id = v_product.id;
    if v_option_count <> v_valid_option_count then
      raise exception 'invalid_product_options';
    end if;

    for v_group in
      select option_group.id, option_group.min_select, option_group.max_select
      from public.option_groups option_group
      where option_group.product_id = v_product.id
    loop
      select count(*)::integer
        into v_group_selection_count
      from jsonb_array_elements_text(v_option_ids) as selected(value)
      join public.options option_row
        on option_row.id::text = selected.value
       and option_row.group_id = v_group.id
       and option_row.is_available;
      if v_group_selection_count < v_group.min_select
         or v_group_selection_count > v_group.max_select then
        raise exception 'invalid_product_options';
      end if;
    end loop;

    select
      coalesce(sum(option_row.price_delta), 0)::bigint,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', option_row.id,
            'name', option_row.name,
            'price_delta', option_row.price_delta
          )
          order by option_row.sort, option_row.id
        ),
        '[]'::jsonb
      )
      into v_option_delta, v_option_snapshots
    from jsonb_array_elements_text(v_option_ids) as selected(value)
    join public.options option_row
      on option_row.id::text = selected.value
     and option_row.is_available;

    v_unit_price := v_product.price::bigint + v_option_delta;
    v_line_total := v_unit_price * v_qty;
    if v_unit_price < 0
       or v_unit_price > 2147483647
       or v_line_total > 2147483647 then
      raise exception 'order_total_out_of_range';
    end if;
    v_subtotal := v_subtotal + v_line_total;
    if v_subtotal > 2147483647 then
      raise exception 'order_total_out_of_range';
    end if;

    v_order_items := v_order_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'partner_id', v_product.partner_id,
        'name_snapshot', coalesce(
          nullif(v_product.name ->> p_locale, ''),
          nullif(v_product.name ->> 'fr', ''),
          nullif(v_product.name ->> 'en', ''),
          v_product.slug
        ),
        'unit_price', v_unit_price,
        'qty', v_qty,
        'line_total', v_line_total,
        'options', v_option_snapshots
      )
    );
  end loop;

  select * into v_partner
  from public.partners partner
  where partner.id = v_partner_id
  for share;
  if not found or v_partner.status <> 'active' or v_partner.is_placeholder then
    raise exception 'partner_not_orderable';
  end if;

  if v_partner.min_order is not null and v_subtotal < v_partner.min_order then
    raise exception 'partner_minimum_not_met';
  end if;

  if exists (
    select 1
    from public.partner_closures closure
    where closure.partner_id = v_partner_id
      and closure.starts_at <= v_now
      and closure.ends_at > v_now
  ) then
    raise exception 'partner_closed';
  end if;

  v_local_time := v_now at time zone 'Africa/Douala';
  v_local_weekday := extract(dow from v_local_time)::integer;
  v_local_minute :=
    extract(hour from v_local_time)::integer * 60
    + extract(minute from v_local_time)::integer;

  select exists (
    select 1
    from public.partner_hours hours
    where hours.partner_id = v_partner_id
      and (
        (
          hours.weekday = v_local_weekday
          and (
            (
              extract(epoch from hours.closes_at) / 60
                > extract(epoch from hours.opens_at) / 60
              and v_local_minute >= extract(epoch from hours.opens_at) / 60
              and extract(epoch from hours.closes_at) / 60 - v_local_minute
                > hours.last_order_before_close
            )
            or (
              extract(epoch from hours.closes_at) / 60
                <= extract(epoch from hours.opens_at) / 60
              and v_local_minute >= extract(epoch from hours.opens_at) / 60
              and 1440 + extract(epoch from hours.closes_at) / 60 - v_local_minute
                > hours.last_order_before_close
            )
          )
        )
        or (
          hours.weekday = (v_local_weekday + 6) % 7
          and extract(epoch from hours.closes_at) / 60
            <= extract(epoch from hours.opens_at) / 60
          and v_local_minute < extract(epoch from hours.closes_at) / 60
          and extract(epoch from hours.closes_at) / 60 - v_local_minute
            > hours.last_order_before_close
        )
      )
  ) into v_open;
  if not v_open then
    raise exception 'partner_closed';
  end if;

  insert into public.orders (
    customer_id,
    address_id,
    zone_id,
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
    idempotency_key
  )
  values (
    p_customer_id,
    p_address_id,
    (
      select neighborhood.zone_id
      from public.neighborhoods neighborhood
      where neighborhood.id = v_address.neighborhood_id
    ),
    v_partner_id,
    'pending_fee_quote',
    v_subtotal::integer,
    0,
    null,
    0,
    0,
    0,
    v_subtotal::integer,
    v_now,
    p_idempotency_key
  )
  on conflict (customer_id, idempotency_key) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select order_row.id into v_order_id
    from public.orders order_row
    where order_row.customer_id = p_customer_id
      and order_row.idempotency_key = p_idempotency_key;
    if v_order_id is null then
      raise exception 'idempotency_recovery_failed';
    end if;
    return v_order_id;
  end if;

  insert into public.order_items (
    order_id,
    product_id,
    partner_id,
    name_snapshot,
    unit_price,
    qty,
    options,
    line_total
  )
  select
    v_order_id,
    (item.value ->> 'product_id')::uuid,
    (item.value ->> 'partner_id')::uuid,
    item.value ->> 'name_snapshot',
    (item.value ->> 'unit_price')::integer,
    (item.value ->> 'qty')::integer,
    item.value -> 'options',
    (item.value ->> 'line_total')::integer
  from jsonb_array_elements(v_order_items) as item(value);

  insert into public.order_status_history (order_id, status, changed_by, reason)
    values (v_order_id, 'pending_fee_quote', p_customer_id, 'customer_submission');
  insert into public.audit_logs (actor_id, action, entity, entity_id, after)
    values (
      p_customer_id,
      'order.fee_quote_requested',
      'orders',
      v_order_id::text,
      jsonb_build_object(
        'status', 'pending_fee_quote',
        'partner_id', v_partner_id,
        'item_count', jsonb_array_length(v_order_items),
        'subtotal', v_subtotal
      )
    );

  return v_order_id;
end;
$$;

revoke all on function public.create_fee_quote_order(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_fee_quote_order(uuid, uuid, text, text, jsonb)
  to service_role;
