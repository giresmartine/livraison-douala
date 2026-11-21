create or replace function public.get_customer_fee_quote_order(p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_config public.order_flow_config;
  v_now timestamptz := clock_timestamp();
  v_cancel_reason text;
  v_result jsonb;
begin
  if auth.uid() is null
     or not public.is_active_user()
     or not public.has_role('client') then
    raise exception 'active_client_authentication_required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order
    and customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status = 'pending_fee_quote' then
    select * into v_config
    from public.order_flow_config
    where singleton;
    if not found or v_config.no_quote_timeout_seconds is null then
      raise exception 'order_flow_not_configured';
    end if;
    if v_order.quote_requested_at <=
       v_now - make_interval(secs => v_config.no_quote_timeout_seconds) then
      v_cancel_reason := 'quote_not_provided';
    end if;
  elsif v_order.status = 'awaiting_customer_confirmation'
     and v_order.quote_expires_at <= v_now then
    v_cancel_reason := 'quote_expired';
  end if;

  if v_cancel_reason is not null then
    update public.orders
    set status = 'cancelled',
        cancel_reason = v_cancel_reason,
        updated_at = v_now
    where id = p_order;
    insert into public.order_status_history (order_id, status, changed_by, reason)
      values (p_order, 'cancelled', auth.uid(), v_cancel_reason);
    insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
      values (
        auth.uid(),
        case v_cancel_reason
          when 'quote_not_provided' then 'order.quote_not_provided'
          else 'order.quote_expired'
        end,
        'orders',
        p_order::text,
        jsonb_build_object('status', v_order.status),
        jsonb_build_object('status', 'cancelled', 'cancel_reason', v_cancel_reason)
      );
  end if;

  select jsonb_build_object(
    'id', id,
    'status', status,
    'subtotal', subtotal,
    'delivery_fee', delivery_fee,
    'total', total,
    'quote_version', quote_version,
    'quote_expires_at', quote_expires_at,
    'cancel_reason', cancel_reason,
    'created_at', created_at
  )
  into v_result
  from public.orders
  where id = p_order
    and customer_id = auth.uid();

  return v_result;
end;
$$;

revoke all on function public.get_customer_fee_quote_order(uuid)
  from public, anon;
grant execute on function public.get_customer_fee_quote_order(uuid)
  to authenticated;
