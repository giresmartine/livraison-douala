-- Sécurité au niveau des lignes : RLS activée sur toutes les tables, politiques minimales et explicites.

do $$
declare t text;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tableowner = current_user
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Identité
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and status = 'active');
create policy roles_select on public.user_roles for select using (user_id = auth.uid() or public.has_role('admin'));
create policy roles_admin on public.user_roles for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Géographie et catalogue publics en lecture
create policy zones_read on public.zones for select using (active or public.is_staff());
create policy zones_write on public.zones for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy neighborhoods_read on public.neighborhoods for select using (true);
create policy neighborhoods_write on public.neighborhoods for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy addresses_owner on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy partners_read on public.partners for select using (status = 'active' or public.is_staff() or public.is_partner_member(id));
create policy partners_update on public.partners for update using (public.is_partner_member(id) or public.has_role('admin')) with check (public.is_partner_member(id) or public.has_role('admin'));
create policy partners_admin on public.partners for insert with check (public.has_role('admin'));
create policy members_read on public.partner_members for select using (user_id = auth.uid() or public.has_role('admin'));
create policy members_admin on public.partner_members for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy hours_read on public.partner_hours for select using (true);
create policy hours_write on public.partner_hours for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy closures_read on public.partner_closures for select using (true);
create policy closures_write on public.partner_closures for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy sections_read on public.menu_sections for select using (true);
create policy sections_write on public.menu_sections for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy products_read on public.products for select using (true);
create policy products_write on public.products for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy option_groups_read on public.option_groups for select using (true);
create policy option_groups_write on public.option_groups for all
  using (exists (select 1 from public.products p where p.id = product_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))))
  with check (exists (select 1 from public.products p where p.id = product_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))));
create policy options_read on public.options for select using (true);
create policy options_write on public.options for all
  using (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id where g.id = group_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))))
  with check (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id where g.id = group_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))));
create policy packs_read on public.packs for select using (active or public.is_staff());
create policy packs_write on public.packs for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy pack_items_read on public.pack_items for select using (true);
create policy pack_items_write on public.pack_items for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy media_read on public.media for select using (status = 'approved' or uploaded_by = auth.uid() or public.is_staff());
create policy media_insert on public.media for insert with check (uploaded_by = auth.uid() and rights_confirmed);
create policy media_moderate on public.media for update using (public.is_staff()) with check (public.is_staff());
create policy promotions_read on public.promotions for select using (active or public.is_staff());
create policy promotions_write on public.promotions for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Commandes : lecture par les personnes concernées, écriture contrôlée
create policy orders_select on public.orders for select using (public.can_read_order(id));
create policy orders_insert on public.orders for insert with check (customer_id = auth.uid() and status = 'draft');
create policy orders_update_draft on public.orders for update using (customer_id = auth.uid() and status = 'draft') with check (customer_id = auth.uid() and status = 'draft');
create policy order_items_select on public.order_items for select using (public.can_read_order(order_id));
create policy order_items_write on public.order_items for all
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'draft'))
  with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'draft'));
create policy secrets_select on public.order_secrets for select using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy history_select on public.order_status_history for select using (public.can_read_order(order_id));
create policy transitions_read on public.order_transitions for select using (public.is_staff());
create policy payments_select on public.payments for select using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.is_staff());
create policy refunds_select on public.refunds for select using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.is_staff());
create policy payment_events_admin on public.payment_events for select using (public.has_role('admin'));
create policy deliveries_select on public.deliveries for select using (courier_id = auth.uid() or public.can_read_order(order_id));
create policy couriers_select on public.couriers for select using (user_id = auth.uid() or public.is_staff());
create policy couriers_self_update on public.couriers for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy errands_select on public.errands for select using (public.can_read_order(order_id));

-- Groupes
create policy groups_select on public.group_orders for select using (organizer_id = auth.uid() or public.is_staff() or exists (select 1 from public.group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy groups_insert on public.group_orders for insert with check (organizer_id = auth.uid());
create policy groups_update on public.group_orders for update using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());
create policy group_members_select on public.group_members for select using (user_id = auth.uid() or exists (select 1 from public.group_orders g where g.id = group_id and g.organizer_id = auth.uid()) or public.is_staff());

-- Vocal, ordonnances, relation client
create policy voice_select on public.voice_requests for select using (user_id = auth.uid() or public.is_staff());
create policy voice_insert on public.voice_requests for insert with check (user_id = auth.uid());
create policy voice_validate on public.voice_requests for update using (public.is_staff()) with check (public.is_staff());
create policy prescriptions_select on public.prescriptions for select using (customer_id = auth.uid() or public.is_partner_member(partner_id) or public.has_role('admin'));
create policy prescriptions_insert on public.prescriptions for insert with check (customer_id = auth.uid());
create policy prescriptions_partner_update on public.prescriptions for update using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id));
create policy reviews_read on public.reviews for select using (is_visible or customer_id = auth.uid() or public.is_staff());
create policy reviews_insert on public.reviews for insert with check (customer_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'delivered'));
create policy loyalty_select on public.loyalty_ledger for select using (user_id = auth.uid() or public.is_staff());
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy push_owner on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tickets_select on public.support_tickets for select using (user_id = auth.uid() or public.is_staff());
create policy tickets_insert on public.support_tickets for insert with check (user_id = auth.uid());
create policy tickets_staff_update on public.support_tickets for update using (public.is_staff()) with check (public.is_staff());
create policy legal_select on public.legal_acceptances for select using (user_id = auth.uid());
create policy legal_insert on public.legal_acceptances for insert with check (user_id = auth.uid());
create policy audit_admin on public.audit_logs for select using (public.has_role('admin'));
create policy settings_admin on public.settings for all using (public.has_role('admin')) with check (public.has_role('admin'));
