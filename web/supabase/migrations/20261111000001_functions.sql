-- Fonctions métier : rôles, horaires, proximité, tarification, transitions de commande.

create or replace function public.has_role(r public.user_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = r);
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'zone_agent'));
$$;

create or replace function public.is_partner_member(p_partner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partner_members pm where pm.partner_id = p_partner and pm.user_id = auth.uid());
$$;

create or replace function public.can_read_order(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff()
    or exists (select 1 from public.orders o where o.id = p_order and o.customer_id = auth.uid())
    or exists (select 1 from public.order_items oi where oi.order_id = p_order and public.is_partner_member(oi.partner_id))
    or exists (select 1 from public.deliveries d where d.order_id = p_order and d.courier_id = auth.uid());
$$;

-- Ouverture d'une enseigne à un instant donné (fuseau Africa/Douala).
create or replace function public.is_open_now(p_partner uuid, p_at timestamptz default now()) returns boolean
language plpgsql stable set search_path = public as $$
declare
  t timestamp := p_at at time zone 'Africa/Douala';
  wd smallint := extract(dow from t)::smallint;
  prev smallint := ((extract(dow from t)::int + 6) % 7)::smallint;
  tm time := t::time;
  ok boolean;
begin
  if exists (select 1 from public.partner_closures c where c.partner_id = p_partner and p_at >= c.starts_at and p_at < c.ends_at) then
    return false;
  end if;
  select exists (
    select 1 from public.partner_hours h
    where h.partner_id = p_partner
      and (
        (h.weekday = wd and ((h.closes_at > h.opens_at and tm >= h.opens_at and tm < h.closes_at)
                          or (h.closes_at <= h.opens_at and tm >= h.opens_at)))
        or (h.weekday = prev and h.closes_at <= h.opens_at and tm < h.closes_at)
      )
  ) into ok;
  return coalesce(ok, false);
end $$;

-- Enseignes qui livrent à un point donné, classées : ouvertes d'abord, puis par distance.
create or replace function public.partners_near(
  p_lat double precision,
  p_lng double precision,
  p_type public.partner_type default null,
  p_limit integer default 60
) returns table (
  id uuid, slug text, name text, type public.partner_type, distance_m double precision,
  logo_path text, cover_path text, rating_avg numeric, rating_count integer,
  avg_prep_minutes integer, is_open boolean
)
language sql stable set search_path = public, extensions as $$
  with pt as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select p.id, p.slug, p.name, p.type, st_distance(p.geo, pt.g), p.logo_path, p.cover_path,
         p.rating_avg, p.rating_count, p.avg_prep_minutes, public.is_open_now(p.id)
  from public.partners p, pt
  where p.status = 'active'
    and (p_type is null or p.type = p_type)
    and st_dwithin(p.geo, pt.g, p.delivery_radius_m)
  order by public.is_open_now(p.id) desc, st_distance(p.geo, pt.g) asc
  limit least(p_limit, 100);
$$;

-- Tarification de livraison selon la zone qui couvre l'adresse.
create or replace function public.delivery_quote(p_lat double precision, p_lng double precision)
returns table (zone_id uuid, zone_name text, delivery_fee integer, min_order integer, night_surcharge integer, rain_surcharge integer, guarantee_enabled boolean)
language sql stable set search_path = public, extensions as $$
  select z.id, z.name, z.delivery_fee, z.min_order, z.night_surcharge, z.rain_surcharge, z.guarantee_enabled
  from public.zones z
  where z.active and st_covers(z.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
  order by z.sort
  limit 1;
$$;

-- Transitions autorisées par rôle. Les passages draft -> pending_payment -> paid sont réservés au service (webhook de paiement).
insert into public.order_transitions (from_status, to_status, role) values
  ('pending_payment', 'cancelled', 'client'),
  ('paid', 'accepted', 'partner'), ('paid', 'cancelled', 'partner'),
  ('accepted', 'preparing', 'partner'), ('accepted', 'cancelled', 'partner'),
  ('preparing', 'ready', 'partner'),
  ('courier_assigned', 'picked_up', 'courier'), ('picked_up', 'on_the_way', 'courier'),
  ('on_the_way', 'delivered', 'courier'), ('on_the_way', 'failed_delivery', 'courier'),
  ('paid', 'cancelled', 'zone_agent'), ('ready', 'courier_assigned', 'zone_agent'),
  ('picked_up', 'on_the_way', 'zone_agent'), ('on_the_way', 'failed_delivery', 'zone_agent'),
  ('delivered', 'refunded', 'zone_agent'), ('failed_delivery', 'refunded', 'zone_agent'),
  ('paid', 'accepted', 'admin'), ('accepted', 'preparing', 'admin'), ('preparing', 'ready', 'admin'),
  ('ready', 'courier_assigned', 'admin'), ('courier_assigned', 'picked_up', 'admin'),
  ('picked_up', 'on_the_way', 'admin'), ('on_the_way', 'delivered', 'admin'), ('on_the_way', 'failed_delivery', 'admin'),
  ('paid', 'cancelled', 'admin'), ('accepted', 'cancelled', 'admin'), ('delivered', 'refunded', 'admin'), ('failed_delivery', 'refunded', 'admin')
on conflict do nothing;

create or replace function public.transition_order(p_order uuid, p_to public.order_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  cur public.order_status;
  allowed boolean;
begin
  select status into cur from public.orders where id = p_order for update;
  if cur is null then
    raise exception 'order_not_found';
  end if;
  if not public.can_read_order(p_order) then
    raise exception 'forbidden';
  end if;
  select exists (
    select 1 from public.order_transitions t
    join public.user_roles ur on ur.role = t.role and ur.user_id = auth.uid()
    where t.from_status = cur and t.to_status = p_to
  ) into allowed;
  if not allowed then
    raise exception 'transition_not_allowed';
  end if;
  update public.orders set status = p_to where id = p_order;
  insert into public.order_status_history (order_id, status, changed_by, reason) values (p_order, p_to, auth.uid(), p_reason);
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (auth.uid(), 'order.transition', 'orders', p_order::text, jsonb_build_object('status', cur), jsonb_build_object('status', p_to));
end $$;

-- Vérification du code de remise sans jamais le renvoyer au livreur.
create or replace function public.confirm_handover(p_order uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  secret public.order_secrets;
begin
  if not exists (select 1 from public.deliveries d where d.order_id = p_order and d.courier_id = auth.uid()) and not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select * into secret from public.order_secrets where order_id = p_order for update;
  if secret.order_id is null or secret.handover_attempts >= 5 then
    return false;
  end if;
  if secret.handover_code = p_code then
    perform public.transition_order(p_order, 'delivered', 'code_ok');
    return true;
  end if;
  update public.order_secrets set handover_attempts = handover_attempts + 1 where order_id = p_order;
  return false;
end $$;

-- Marque les ordonnances expirées et renvoie les chemins de fichiers à supprimer dans le stockage.
create or replace function public.expire_prescriptions() returns setof text
language sql security definer set search_path = public as $$
  update public.prescriptions set status = 'expired'
  where expires_at < now() and status <> 'expired'
  returning file_path;
$$;

-- Création automatique du profil et du rôle client à l'inscription.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Moyenne des avis par enseigne.
create or replace function public.refresh_partner_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := coalesce(new.partner_id, old.partner_id);
begin
  update public.partners p set
    rating_avg = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.partner_id = pid and r.is_visible),
    rating_count = (select count(*) from public.reviews r where r.partner_id = pid and r.is_visible)
  where p.id = pid;
  return null;
end $$;

create trigger trg_reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_partner_rating();
