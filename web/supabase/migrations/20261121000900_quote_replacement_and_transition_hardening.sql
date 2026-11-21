alter table public.orders
  add column quote_replacement_requested_at timestamptz;

update public.orders
set quote_replacement_requested_at = updated_at
where status = 'cancelled'
  and cancel_reason = 'quote_replaced';

create or replace function public.guard_fee_quote_reissue_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timeout_seconds integer;
  v_now timestamptz := clock_timestamp();
begin
  if new.status = 'cancelled'
     and new.cancel_reason = 'quote_replaced'
     and (
       old.status is distinct from new.status
       or old.cancel_reason is distinct from new.cancel_reason
     ) then
    new.quote_replacement_requested_at := v_now;
  elsif old.status = 'cancelled'
     and old.cancel_reason = 'quote_replaced'
     and new.status = 'awaiting_customer_confirmation' then
    select config.no_quote_timeout_seconds
      into v_timeout_seconds
    from public.order_flow_config config
    where config.singleton;

    if not found
       or v_timeout_seconds is null
       or old.quote_replacement_requested_at is null
       or v_now >= old.quote_replacement_requested_at
         + make_interval(secs => v_timeout_seconds) then
      raise exception 'quote_replacement_expired';
    end if;

    new.quote_replacement_requested_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_fee_quote_reissue_window()
  from public, anon, authenticated;

create trigger orders_guard_fee_quote_reissue_window
  before update on public.orders
  for each row execute function public.guard_fee_quote_reissue_window();

create or replace function public.transition_order(
  p_order uuid,
  p_to public.order_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_status public.order_status;
  v_allowed boolean;
begin
  select order_row.status
    into v_current_status
  from public.orders order_row
  where order_row.id = p_order
  for update;

  if v_current_status is null then
    raise exception 'order_not_found';
  end if;

  if v_current_status in (
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
    from public.order_transitions transition_row
    join public.user_roles role_row
      on role_row.role = transition_row.role
     and role_row.user_id = auth.uid()
    where transition_row.from_status = v_current_status
      and transition_row.to_status = p_to
  )
    into v_allowed;

  if not v_allowed then
    raise exception 'transition_not_allowed';
  end if;

  update public.orders
  set status = p_to
  where id = p_order;

  insert into public.order_status_history (order_id, status, changed_by, reason)
    values (p_order, p_to, auth.uid(), p_reason);

  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (
      auth.uid(),
      'order.transition',
      'orders',
      p_order::text,
      jsonb_build_object('status', v_current_status),
      jsonb_build_object('status', p_to)
    );
end;
$$;

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
  v_partner_name text;
  v_delivery_address jsonb;
  v_items jsonb;
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

  if v_order.status = 'pending_fee_quote'
     or (
       v_order.status = 'cancelled'
       and v_order.cancel_reason = 'quote_replaced'
     ) then
    select * into v_config
    from public.order_flow_config
    where singleton;
    if not found or v_config.no_quote_timeout_seconds is null then
      raise exception 'order_flow_not_configured';
    end if;

    if v_order.status = 'pending_fee_quote'
       and v_order.quote_requested_at <=
         v_now - make_interval(secs => v_config.no_quote_timeout_seconds) then
      v_cancel_reason := 'quote_not_provided';
    elsif v_order.status = 'cancelled'
       and (
         v_order.quote_replacement_requested_at is null
         or v_order.quote_replacement_requested_at <=
           v_now - make_interval(secs => v_config.no_quote_timeout_seconds)
       ) then
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
        jsonb_build_object(
          'status', v_order.status,
          'cancel_reason', v_order.cancel_reason
        ),
        jsonb_build_object('status', 'cancelled', 'cancel_reason', v_cancel_reason)
      );
  end if;

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
  where address.id = v_order.address_id
    and address.user_id = auth.uid();
  if not found then
    v_delivery_address := null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', item.name_snapshot,
        'quantity', item.qty,
        'unit_price', item.unit_price,
        'line_total', item.line_total,
        'options', item.options
      )
      order by item.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items item
  where item.order_id = p_order;

  select jsonb_build_object(
    'id', order_row.id,
    'status', order_row.status,
    'subtotal', order_row.subtotal,
    'delivery_fee', order_row.delivery_fee,
    'total', order_row.total,
    'quote_version', order_row.quote_version,
    'quote_expires_at', order_row.quote_expires_at,
    'cancel_reason', order_row.cancel_reason,
    'created_at', order_row.created_at,
    'partner_name', v_partner_name,
    'delivery_address', v_delivery_address,
    'items', v_items,
    'quote_replacement_deadline_at',
      case
        when order_row.status = 'cancelled'
         and order_row.cancel_reason = 'quote_replaced'
          then order_row.quote_replacement_requested_at
            + make_interval(secs => v_config.no_quote_timeout_seconds)
        else null
      end
  )
  into v_result
  from public.orders order_row
  where order_row.id = p_order
    and order_row.customer_id = auth.uid();

  return v_result;
end;
$$;

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
  if auth.uid() is null
     or not public.is_active_user()
     or not public.has_role('admin') then
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
    select id, status, quote_requested_at, quote_expires_at,
      quote_replacement_requested_at, cancel_reason
    from public.orders
    where status in ('pending_fee_quote', 'awaiting_customer_confirmation')
       or (status = 'cancelled' and cancel_reason = 'quote_replaced')
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
    elsif v_order.status = 'cancelled'
       and (
         v_order.quote_replacement_requested_at is null
         or v_order.quote_replacement_requested_at <=
           v_now - make_interval(secs => v_config.no_quote_timeout_seconds)
       ) then
      update public.orders
      set cancel_reason = 'quote_not_provided',
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
          jsonb_build_object('status', 'cancelled', 'cancel_reason', 'quote_replaced'),
          jsonb_build_object('status', 'cancelled', 'cancel_reason', 'quote_not_provided')
        );
    end if;
  end loop;

  for v_order in
    select id, status, subtotal, delivery_fee, total, quote_requested_at,
      quote_expires_at, quote_version, created_at, address_id, partner_id,
      quote_replacement_requested_at
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
      'items', v_items,
      'quote_replacement_requested_at', v_order.quote_replacement_requested_at
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
