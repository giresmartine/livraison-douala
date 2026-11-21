create or replace function public.get_admin_fee_quote_queue()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config public.order_flow_config;
  v_now timestamptz := clock_timestamp();
  v_order record;
  v_partner_name text;
  v_delivery_address jsonb;
  v_items jsonb;
  v_entry jsonb;
  v_orders jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_active_user() or not public.has_role('admin') then
    raise exception 'admin_required';
  end if;

  select * into v_config
  from public.order_flow_config
  where singleton;
  if not found
     or v_config.max_delivery_fee_xaf is null
     or v_config.no_quote_timeout_seconds is null then
    raise exception 'order_flow_not_configured';
  end if;

  for v_order in
    select id, status, quote_requested_at, quote_expires_at
    from public.orders
    where status in ('pending_fee_quote', 'awaiting_customer_confirmation')
    for update
  loop
    if v_order.status = 'pending_fee_quote'
       and v_order.quote_requested_at <=
         v_now - make_interval(secs => v_config.no_quote_timeout_seconds) then
      update public.orders
      set status = 'cancelled',
          cancel_reason = 'quote_not_provided',
          updated_at = v_now
      where id = v_order.id;
      insert into public.order_status_history (order_id, status, changed_by, reason)
        values (v_order.id, 'cancelled', auth.uid(), 'quote_not_provided');
      insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
        values (
          auth.uid(),
          'order.quote_not_provided',
          'orders',
          v_order.id::text,
          jsonb_build_object('status', v_order.status),
          jsonb_build_object('status', 'cancelled', 'cancel_reason', 'quote_not_provided')
        );
    elsif v_order.status = 'awaiting_customer_confirmation'
       and v_order.quote_expires_at <= v_now then
      update public.orders
      set status = 'cancelled',
          cancel_reason = 'quote_expired',
          updated_at = v_now
      where id = v_order.id;
      insert into public.order_status_history (order_id, status, changed_by, reason)
        values (v_order.id, 'cancelled', auth.uid(), 'quote_expired');
      insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
        values (
          auth.uid(),
          'order.quote_expired',
          'orders',
          v_order.id::text,
          jsonb_build_object('status', v_order.status),
          jsonb_build_object('status', 'cancelled', 'cancel_reason', 'quote_expired')
        );
    end if;
  end loop;

  for v_order in
    select id, status, subtotal, delivery_fee, total, quote_requested_at,
      quote_expires_at, quote_version, created_at, address_id, partner_id
    from public.orders
    where status in ('pending_fee_quote', 'awaiting_customer_confirmation')
       or (status = 'cancelled' and cancel_reason = 'quote_replaced')
    order by quote_requested_at, created_at
  loop
    select partner.name into v_partner_name
    from public.partners partner
    where partner.id = v_order.partner_id;

    select jsonb_build_object(
      'neighborhood', address.label,
      'landmark', address.landmark,
      'details', address.details
    )
    into v_delivery_address
    from public.addresses address
    where address.id = v_order.address_id;
    if not found then
      v_delivery_address := null;
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', item.name_snapshot,
          'quantity', item.qty,
          'options', item.options
        )
        order by item.id
      ),
      '[]'::jsonb
    )
    into v_items
    from public.order_items item
    where item.order_id = v_order.id;

    v_entry := jsonb_build_object(
      'id', v_order.id,
      'status', v_order.status,
      'subtotal', v_order.subtotal,
      'delivery_fee', v_order.delivery_fee,
      'total', v_order.total,
      'quote_requested_at', v_order.quote_requested_at,
      'quote_expires_at', v_order.quote_expires_at,
      'quote_version', v_order.quote_version,
      'created_at', v_order.created_at,
      'partner_name', v_partner_name,
      'delivery_address', v_delivery_address,
      'items', v_items
    );
    v_orders := v_orders || jsonb_build_array(v_entry);

    insert into public.audit_logs (actor_id, action, entity, entity_id, after)
      values (
        auth.uid(),
        'admin.order_fee_quote.read',
        'orders',
        v_order.id::text,
        jsonb_build_object(
          'context', 'fee_quote_queue',
          'fields', jsonb_build_array('delivery_address', 'items', 'subtotal')
        )
      );
  end loop;

  return jsonb_build_object(
    'max_delivery_fee_xaf', v_config.max_delivery_fee_xaf,
    'server_now', v_now,
    'orders', v_orders
  );
end;
$$;

revoke all on function public.get_admin_fee_quote_queue()
  from public, anon;
grant execute on function public.get_admin_fee_quote_queue()
  to authenticated;
