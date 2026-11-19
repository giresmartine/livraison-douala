-- Keep every table inaccessible unless a policy and a narrow grant are explicit.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, language) on public.profiles to authenticated;
grant select on public.user_roles to authenticated;

grant select (slug, name, icon, sort) on public.categories to anon, authenticated;
grant select (
  id, slug, type, name, description, cuisine_tags, address_text,
  delivery_radius_m, avg_prep_minutes, min_order, rating_avg,
  rating_count, logo_path, cover_path, status, is_placeholder
) on public.partners to anon, authenticated;
grant select (
  partner_id, weekday, opens_at, closes_at, last_order_before_close
) on public.partner_hours to anon, authenticated;
grant select (partner_id, starts_at, ends_at) on public.partner_closures to anon, authenticated;
grant select (
  id, partner_id, section_id, category_id, slug, name, description,
  price, compare_at_price, is_available, requires_age_check,
  is_medicine, is_placeholder, prep_minutes, image_path, sort
) on public.products to anon, authenticated;
grant select (id, partner_id, name, sort) on public.menu_sections to anon, authenticated;
grant select (id, product_id, name, min_select, max_select, sort)
  on public.option_groups to anon, authenticated;
grant select (id, group_id, name, price_delta, is_available, sort)
  on public.options to anon, authenticated;
grant select (id, name, description, price, guarantee_eligible, single_stop, image_path, active)
  on public.packs to anon, authenticated;
grant select (pack_id, product_id, qty) on public.pack_items to anon, authenticated;
grant select (partner_id, rating, comment, tags, created_at)
  on public.reviews to anon, authenticated;
grant select (code, kind, value, min_order, partner_id, starts_at, ends_at, active)
  on public.promotions to anon, authenticated;
-- Earlier baseline policies were intentionally broad; remove them before adding
-- the narrower public-catalogue rules below.
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists roles_select on public.user_roles;
drop policy if exists roles_admin on public.user_roles;
drop policy if exists categories_read on public.categories;
drop policy if exists partners_read on public.partners;
drop policy if exists hours_read on public.partner_hours;
drop policy if exists closures_read on public.partner_closures;
drop policy if exists sections_read on public.menu_sections;
drop policy if exists products_read on public.products;
drop policy if exists option_groups_read on public.option_groups;
drop policy if exists options_read on public.options;
drop policy if exists packs_read on public.packs;
drop policy if exists pack_items_read on public.pack_items;
drop policy if exists reviews_read on public.reviews;
drop policy if exists promotions_read on public.promotions;

create or replace function public.storefront_partner_is_public(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partners partner
    where partner.id = target_partner_id
      and partner.status = 'active'
      and not partner.is_placeholder
      and (
        select count(*)
        from public.products product
        where product.partner_id = partner.id
          and product.is_available
          and not product.is_placeholder
          and not product.is_medicine
      ) >= 5
  );
$$;

revoke all on function public.storefront_partner_is_public(uuid) from public, anon, authenticated;
grant execute on function public.storefront_partner_is_public(uuid) to anon, authenticated;

create policy "Public can read verified categories"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "Public can read active verified partners"
  on public.partners for select
  to anon, authenticated
  using (public.storefront_partner_is_public(id));

create policy "Public can read hours of active verified partners"
  on public.partner_hours for select
  to anon, authenticated
  using (public.storefront_partner_is_public(partner_id));

create policy "Public can read closures of active verified partners"
  on public.partner_closures for select
  to anon, authenticated
  using (public.storefront_partner_is_public(partner_id));

create policy "Public can read available verified non-medicine products"
  on public.products for select
  to anon, authenticated
  using (
    is_available
    and not is_placeholder
    and not is_medicine
    and public.storefront_partner_is_public(partner_id)
  );

create policy "Public can read sections of active verified partners"
  on public.menu_sections for select
  to anon, authenticated
  using (public.storefront_partner_is_public(partner_id));

create policy "Public can read option groups for available verified products"
  on public.option_groups for select
  to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = option_groups.product_id
      and p.is_available
      and not p.is_placeholder
      and not p.is_medicine
      and public.storefront_partner_is_public(p.partner_id)
  ));

create policy "Public can read options for available verified products"
  on public.options for select
  to anon, authenticated
  using (is_available and exists (
    select 1
    from public.option_groups g
    join public.products p on p.id = g.product_id
    where g.id = options.group_id
      and p.is_available
      and not p.is_placeholder
      and not p.is_medicine
      and public.storefront_partner_is_public(p.partner_id)
  ));

create policy "Public can read active packs"
  on public.packs for select
  to anon, authenticated
  using (active);

create policy "Public can read items of active packs"
  on public.pack_items for select
  to anon, authenticated
  using (exists (
    select 1 from public.packs p
    where p.id = pack_items.pack_id and p.active
  ) and exists (
    select 1 from public.products product
    where product.id = pack_items.product_id
      and product.is_available
      and not product.is_placeholder
      and not product.is_medicine
      and public.storefront_partner_is_public(product.partner_id)
  ));

create policy "Public can read visible reviews from active verified partners"
  on public.reviews for select
  to anon, authenticated
  using (
    is_visible
    and public.storefront_partner_is_public(partner_id)
  );

create policy "Public can read active current promotions"
  on public.promotions for select
  to anon, authenticated
  using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (partner_id is null or public.storefront_partner_is_public(partner_id))
  );

create or replace function public.storefront_eligible_partner_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select product.partner_id
  from public.products product
  join public.partners partner on partner.id = product.partner_id
  where partner.status = 'active'
    and not partner.is_placeholder
    and product.is_available
    and not product.is_placeholder
    and not product.is_medicine
  group by product.partner_id
  having count(*) >= 5;
$$;

revoke all on function public.storefront_eligible_partner_ids() from public, anon, authenticated;
grant execute on function public.storefront_eligible_partner_ids() to anon, authenticated;
