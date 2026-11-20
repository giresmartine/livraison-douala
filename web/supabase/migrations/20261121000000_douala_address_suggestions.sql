grant select (id, name, zone_id)
  on public.neighborhoods to anon, authenticated;
grant select (id, delivery_fee, active)
  on public.zones to anon, authenticated;
grant select (id, label, neighborhood_id, landmark, updated_at)
  on public.addresses to authenticated;
