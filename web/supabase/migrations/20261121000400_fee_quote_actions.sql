create or replace function public.transition_order(
  p_order uuid,
  p_to public.order_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.order_status;
  allowed boolean;
begin
  select status into cur from public.orders where id = p_order for update;
  if cur is null then
    raise exception 'order_not_found';
  end if;
  if cur in (
      'pending_fee_quote',
      'awaiting_customer_confirmation',
      'quote_accepted'
    )
    or p_to in (
      'pending_fee_quote',
      'awaiting_customer_confirmation',
      'quote_accepted'
    ) then
    raise exception 'fee_quote_specific_action_required';
  end if;
  if not public.can_read_order(p_order) then
    raise exception 'forbidden';
  end if;
  select exists (
    select 1
    from public.order_transitions t
    join public.user_roles ur on ur.role = t.role and ur.user_id = auth.uid()
    where t.from_status = cur
      and t.to_status = p_to
  ) into allowed;
  if not allowed then
    raise exception 'transition_not_allowed';
  end if;
  update public.orders set status = p_to where id = p_order;
  insert into public.order_status_history (order_id, status, changed_by, reason)
    values (p_order, p_to, auth.uid(), p_reason);
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (
      auth.uid(),
      'order.transition',
      'orders',
      p_order::text,
      jsonb_build_object('status', cur),
      jsonb_build_object('status', p_to)
    );
end;
$$;

create or replace function public.send_order_fee_quote(
  p_order uuid,
  p_delivery_fee integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_config public.order_flow_config;
  v_now timestamptz := clock_timestamp();
  v_expires_at timestamptz;
  v_version integer;
  v_total bigint;
  v_previous_status public.order_status;
begin
  if auth.uid() is null or not public.is_active_user() or not public.has_role('admin') then
    raise exception 'admin_required';
  end if;

  select * into v_config
  from public.order_flow_config
  where singleton;
  if not found
     or v_config.max_delivery_fee_xaf is null
     or v_config.quote_expiry_seconds is null
     or v_config.no_quote_timeout_seconds is null then
    raise exception 'order_flow_not_configured';
  end if;
  if not public.admin_quote_session_is_recent() then
    raise exception 'admin_reauth_required';
  end if;
  if p_delivery_fee is null or p_delivery_fee < 0
     or p_delivery_fee > v_config.max_delivery_fee_xaf then
    raise exception 'delivery_fee_out_of_limit';
  end if;

  select * into v_order
  from public.orders
  where id = p_order
  for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  v_previous_status := v_order.status;
  if v_order.status = 'pending_fee_quote' then
    if v_order.quote_requested_at <=
       v_now - make_interval(secs => v_config.no_quote_timeout_seconds) then
      update public.orders
      set status = 'cancelled',
          cancel_reason = 'quote_not_provided',
          updated_at = v_now
      where id = p_order;
      insert into public.order_status_history (order_id, status, changed_by, reason)
        values (p_order, 'cancelled', auth.uid(), 'quote_not_provided');
      insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
        values (
          auth.uid(),
          'order.quote_not_provided',
          'orders',
          p_order::text,
          jsonb_build_object('status', v_previous_status),
          jsonb_build_object('status', 'cancelled', 'cancel_reason', 'quote_not_provided')
        );
      return 'cancelled_quote_not_provided';
    end if;
  elsif v_order.status = 'cancelled'
     and v_order.cancel_reason = 'quote_replaced'
     and v_order.quote_version > 0 then
    null;
  else
    raise exception 'order_not_quoteable';
  end if;

  v_total := v_order.subtotal - v_order.discount_total + p_delivery_fee;
  if v_total < 0 or v_total > 2147483647 then
    raise exception 'order_total_out_of_range';
  end if;

  v_version := v_order.quote_version + 1;
  v_expires_at := v_now + make_interval(secs => v_config.quote_expiry_seconds);

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
    p_order,
    v_version,
    p_delivery_fee,
    v_order.subtotal,
    v_order.discount_total,
    v_total::integer,
    auth.uid(),
    v_now,
    v_expires_at
  );

  update public.orders
  set status = 'awaiting_customer_confirmation',
      delivery_fee = p_delivery_fee,
      total = v_total::integer,
      quote_expires_at = v_expires_at,
      quote_version = v_version,
      cancel_reason = null,
      updated_at = v_now
  where id = p_order;

  insert into public.order_status_history (order_id, status, changed_by, reason)
    values (
      p_order,
      'awaiting_customer_confirmation',
      auth.uid(),
      case when v_previous_status = 'cancelled' then 'fee_quote_reissued' else 'fee_quote_sent' end
    );
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (
      auth.uid(),
      case when v_previous_status = 'cancelled' then 'order.quote_reissued' else 'order.quote_sent' end,
      'orders',
      p_order::text,
      jsonb_build_object('status', v_previous_status, 'quote_version', v_order.quote_version),
      jsonb_build_object(
        'status', 'awaiting_customer_confirmation',
        'quote_version', v_version,
        'delivery_fee', p_delivery_fee,
        'total', v_total
      )
    );

  return case when v_previous_status = 'cancelled' then 'quote_reissued' else 'quote_sent' end;
end;
$$;

create or replace function public.cancel_order_fee_quote(p_order uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_config public.order_flow_config;
  v_now timestamptz := clock_timestamp();
  v_cancel_reason text;
  v_actor_is_admin boolean;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'active_authentication_required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order
  for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  v_actor_is_admin := public.has_role('admin');
  if v_actor_is_admin then
    select * into v_config
    from public.order_flow_config
    where singleton;
    if not found or not public.admin_quote_session_is_recent() then
      raise exception 'admin_reauth_required';
    end if;
    if v_order.status <> 'awaiting_customer_confirmation' then
      raise exception 'order_not_quoteable';
    end if;
    v_cancel_reason := 'quote_replaced';
  else
    if not public.has_role('client') or v_order.customer_id <> auth.uid() then
      raise exception 'forbidden';
    end if;
    if v_order.status = 'pending_fee_quote' then
      v_cancel_reason := 'customer_cancelled';
    elsif v_order.status = 'awaiting_customer_confirmation' then
      v_cancel_reason := 'quote_declined';
    else
      raise exception 'order_not_cancellable';
    end if;
  end if;

  if v_order.status = 'pending_fee_quote' then
    select * into v_config from public.order_flow_config where singleton;
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
      'order.quote_cancelled',
      'orders',
      p_order::text,
      jsonb_build_object('status', v_order.status, 'quote_version', v_order.quote_version),
      jsonb_build_object('status', 'cancelled', 'cancel_reason', v_cancel_reason)
    );

  return v_cancel_reason;
end;
$$;

create or replace function public.accept_order_fee_quote(
  p_order uuid,
  p_displayed_total integer,
  p_displayed_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_quote public.order_fee_quotes;
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not public.is_active_user() or not public.has_role('client') then
    raise exception 'active_client_authentication_required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order
  for update;
  if not found or v_order.customer_id <> auth.uid() then
    raise exception 'order_not_found';
  end if;
  if v_order.status <> 'awaiting_customer_confirmation' then
    raise exception 'order_not_awaiting_confirmation';
  end if;

  select * into v_quote
  from public.order_fee_quotes
  where order_id = p_order
    and version = v_order.quote_version;
  if not found
     or v_quote.delivery_fee <> v_order.delivery_fee
     or v_quote.total <> v_order.total
     or v_quote.expires_at <> v_order.quote_expires_at then
    raise exception 'quote_integrity_error';
  end if;

  if v_now >= v_quote.expires_at then
    update public.orders
    set status = 'cancelled',
        cancel_reason = 'quote_expired',
        updated_at = v_now
    where id = p_order;
    insert into public.order_status_history (order_id, status, changed_by, reason)
      values (p_order, 'cancelled', auth.uid(), 'quote_expired');
    insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
      values (
        auth.uid(),
        'order.quote_expired',
        'orders',
        p_order::text,
        jsonb_build_object('status', v_order.status, 'quote_version', v_order.quote_version),
        jsonb_build_object('status', 'cancelled', 'cancel_reason', 'quote_expired')
      );
    return false;
  end if;

  if p_displayed_total is distinct from v_quote.total
     or p_displayed_version is distinct from v_quote.version then
    raise exception 'quote_display_mismatch';
  end if;

  update public.orders
  set status = 'quote_accepted',
      updated_at = v_now
  where id = p_order;
  insert into public.order_status_history (order_id, status, changed_by, reason)
    values (p_order, 'quote_accepted', auth.uid(), 'customer_accepted');
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (
      auth.uid(),
      'order.quote_accepted',
      'orders',
      p_order::text,
      jsonb_build_object('status', v_order.status, 'quote_version', v_order.quote_version),
      jsonb_build_object('status', 'quote_accepted', 'total', v_quote.total, 'quote_version', v_quote.version)
    );
  return true;
end;
$$;

revoke all on function public.send_order_fee_quote(uuid, integer)
  from public, anon;
revoke all on function public.cancel_order_fee_quote(uuid)
  from public, anon;
revoke all on function public.accept_order_fee_quote(uuid, integer, integer)
  from public, anon;
grant execute on function public.send_order_fee_quote(uuid, integer) to authenticated;
grant execute on function public.cancel_order_fee_quote(uuid) to authenticated;
grant execute on function public.accept_order_fee_quote(uuid, integer, integer) to authenticated;
