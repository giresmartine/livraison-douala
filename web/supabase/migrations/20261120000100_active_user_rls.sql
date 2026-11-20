create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to anon, authenticated, service_role;

create or replace function public.has_role(r public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = r
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'zone_agent')
  );
$$;

create or replace function public.is_partner_member(p_partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1
    from public.partner_members pm
    where pm.partner_id = p_partner
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.can_read_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and (
    public.is_staff()
    or exists (
      select 1
      from public.orders o
      where o.id = p_order
        and o.customer_id = auth.uid()
    )
    or exists (
      select 1
      from public.order_items oi
      where oi.order_id = p_order
        and public.is_partner_member(oi.partner_id)
    )
    or exists (
      select 1
      from public.deliveries d
      where d.order_id = p_order
        and d.courier_id = auth.uid()
    )
  );
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (public.is_active_user() and (id = auth.uid() or public.is_staff()));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (public.is_active_user() and id = auth.uid())
  with check (public.is_active_user() and id = auth.uid() and status = 'active');
drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles for select
  using (public.is_active_user() and (user_id = auth.uid() or public.has_role('admin')));
drop policy if exists roles_admin on public.user_roles;
create policy roles_admin on public.user_roles for all
  using (public.is_active_user() and public.has_role('admin'))
  with check (public.is_active_user() and public.has_role('admin'));
drop policy if exists addresses_owner on public.addresses;
create policy addresses_owner on public.addresses for all
  using (public.is_active_user() and user_id = auth.uid())
  with check (public.is_active_user() and user_id = auth.uid());
drop policy if exists members_read on public.partner_members;
create policy members_read on public.partner_members for select
  using (public.is_active_user() and (user_id = auth.uid() or public.has_role('admin')));
drop policy if exists members_admin on public.partner_members;
create policy members_admin on public.partner_members for all
  using (public.is_active_user() and public.has_role('admin'))
  with check (public.is_active_user() and public.has_role('admin'));

drop policy if exists media_read on public.media;
create policy media_read on public.media for select
  using (
    status = 'approved'
    or (public.is_active_user() and uploaded_by = auth.uid())
    or public.is_staff()
  );
drop policy if exists media_insert on public.media;
create policy media_insert on public.media for insert
  with check (public.is_active_user() and uploaded_by = auth.uid() and rights_confirmed);

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (public.is_active_user() and public.can_read_order(id));
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (public.is_active_user() and customer_id = auth.uid() and status = 'draft');
drop policy if exists orders_update_draft on public.orders;
create policy orders_update_draft on public.orders for update
  using (public.is_active_user() and customer_id = auth.uid() and status = 'draft')
  with check (public.is_active_user() and customer_id = auth.uid() and status = 'draft');
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (public.is_active_user() and public.can_read_order(order_id));
drop policy if exists order_items_write on public.order_items;
create policy order_items_write on public.order_items for all
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.status = 'draft'
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.status = 'draft'
    )
  );
drop policy if exists secrets_select on public.order_secrets;
create policy secrets_select on public.order_secrets for select
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );
drop policy if exists history_select on public.order_status_history;
create policy history_select on public.order_status_history for select
  using (public.is_active_user() and public.can_read_order(order_id));
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select
  using (
    public.is_active_user()
    and (
      exists (
        select 1
        from public.orders o
        where o.id = order_id
          and o.customer_id = auth.uid()
      )
      or public.is_staff()
    )
  );
drop policy if exists refunds_select on public.refunds;
create policy refunds_select on public.refunds for select
  using (
    public.is_active_user()
    and (
      exists (
        select 1
        from public.orders o
        where o.id = order_id
          and o.customer_id = auth.uid()
      )
      or public.is_staff()
    )
  );
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select on public.deliveries for select
  using (
    public.is_active_user()
    and (courier_id = auth.uid() or public.can_read_order(order_id))
  );
drop policy if exists couriers_select on public.couriers;
create policy couriers_select on public.couriers for select
  using (public.is_active_user() and (user_id = auth.uid() or public.is_staff()));
drop policy if exists couriers_self_update on public.couriers;
create policy couriers_self_update on public.couriers for update
  using (public.is_active_user() and user_id = auth.uid())
  with check (public.is_active_user() and user_id = auth.uid());
drop policy if exists errands_select on public.errands;
create policy errands_select on public.errands for select
  using (public.is_active_user() and public.can_read_order(order_id));

drop policy if exists groups_select on public.group_orders;
create policy groups_select on public.group_orders for select
  using (
    public.is_active_user()
    and (
      organizer_id = auth.uid()
      or public.is_staff()
      or exists (
        select 1 from public.group_members m
        where m.group_id = id and m.user_id = auth.uid()
      )
    )
  );
drop policy if exists groups_insert on public.group_orders;
create policy groups_insert on public.group_orders for insert
  with check (public.is_active_user() and organizer_id = auth.uid());
drop policy if exists groups_update on public.group_orders;
create policy groups_update on public.group_orders for update
  using (public.is_active_user() and organizer_id = auth.uid())
  with check (public.is_active_user() and organizer_id = auth.uid());
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select
  using (
    public.is_active_user()
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.group_orders g
        where g.id = group_id and g.organizer_id = auth.uid()
      )
      or public.is_staff()
    )
  );

drop policy if exists voice_select on public.voice_requests;
create policy voice_select on public.voice_requests for select
  using (public.is_active_user() and (user_id = auth.uid() or public.is_staff()));
drop policy if exists voice_insert on public.voice_requests;
create policy voice_insert on public.voice_requests for insert
  with check (public.is_active_user() and user_id = auth.uid());
drop policy if exists voice_validate on public.voice_requests;
create policy voice_validate on public.voice_requests for update
  using (public.is_active_user() and public.is_staff())
  with check (public.is_active_user() and public.is_staff());
drop policy if exists prescriptions_select on public.prescriptions;
create policy prescriptions_select on public.prescriptions for select
  using (
    public.is_active_user()
    and (
      customer_id = auth.uid()
      or public.is_partner_member(partner_id)
      or public.has_role('admin')
    )
  );
drop policy if exists prescriptions_insert on public.prescriptions;
create policy prescriptions_insert on public.prescriptions for insert
  with check (public.is_active_user() and customer_id = auth.uid());
drop policy if exists prescriptions_partner_update on public.prescriptions;
create policy prescriptions_partner_update on public.prescriptions for update
  using (public.is_active_user() and public.is_partner_member(partner_id))
  with check (public.is_active_user() and public.is_partner_member(partner_id));
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select
  using (
    is_visible
    or (public.is_active_user() and customer_id = auth.uid())
    or public.is_staff()
  );
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (
    public.is_active_user()
    and customer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.status = 'delivered'
    )
  );
drop policy if exists loyalty_select on public.loyalty_ledger;
create policy loyalty_select on public.loyalty_ledger for select
  using (
    public.is_active_user()
    and (user_id = auth.uid() or public.is_staff())
  );
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
  using (public.is_active_user() and user_id = auth.uid());
drop policy if exists push_owner on public.push_subscriptions;
create policy push_owner on public.push_subscriptions for all
  using (public.is_active_user() and user_id = auth.uid())
  with check (public.is_active_user() and user_id = auth.uid());
drop policy if exists tickets_select on public.support_tickets;
create policy tickets_select on public.support_tickets for select
  using (public.is_active_user() and (user_id = auth.uid() or public.is_staff()));
drop policy if exists tickets_insert on public.support_tickets;
create policy tickets_insert on public.support_tickets for insert
  with check (public.is_active_user() and user_id = auth.uid());
drop policy if exists tickets_staff_update on public.support_tickets;
create policy tickets_staff_update on public.support_tickets for update
  using (public.is_active_user() and public.is_staff())
  with check (public.is_active_user() and public.is_staff());
drop policy if exists legal_select on public.legal_acceptances;
create policy legal_select on public.legal_acceptances for select
  using (public.is_active_user() and user_id = auth.uid());
drop policy if exists legal_insert on public.legal_acceptances;
create policy legal_insert on public.legal_acceptances for insert
  with check (public.is_active_user() and user_id = auth.uid());
