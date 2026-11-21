drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (
    public.is_active_user()
    and (
      customer_id = auth.uid()
      or (
        quote_requested_at is null
        and public.can_read_order(id)
      )
    )
  );

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.orders order_row
      where order_row.id = order_id
        and (
          order_row.customer_id = auth.uid()
          or (
            order_row.quote_requested_at is null
            and public.can_read_order(order_row.id)
          )
        )
    )
  );

drop policy if exists history_select on public.order_status_history;
create policy history_select on public.order_status_history for select
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.orders order_row
      where order_row.id = order_id
        and (
          order_row.customer_id = auth.uid()
          or (
            order_row.quote_requested_at is null
            and public.can_read_order(order_row.id)
          )
        )
    )
  );

drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select on public.deliveries for select
  using (
    public.is_active_user()
    and (
      (
        courier_id = auth.uid()
        and public.has_role('courier')
        and exists (
          select 1
          from public.couriers courier
          where courier.user_id = auth.uid()
            and courier.is_active
        )
      )
      or (
        exists (
          select 1
          from public.orders order_row
          where order_row.id = order_id
            and order_row.quote_requested_at is null
        )
        and public.can_read_order(order_id)
      )
    )
  );
