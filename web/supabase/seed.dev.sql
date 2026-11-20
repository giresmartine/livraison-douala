-- Local-only fixtures. This file is intentionally not listed in config.toml
-- or any production migration. To run locally, set livraison.seed_mode=local
-- in the same psql session before loading this file.
do $$
begin
  if current_setting('livraison.seed_mode', true) is distinct from 'local' then
    raise exception 'seed.dev.sql requires the explicit local-only livraison.seed_mode=local setting';
  end if;
end
$$;

insert into public.zones (
  name, delivery_fee, min_order, night_surcharge, rain_surcharge, sort, active
)
select fixtures.name, fixtures.delivery_fee, 0, 0, 0, fixtures.sort, true
from (values
  ('TEST - Zone A', 101, 1),
  ('TEST - Zone B', 202, 2),
  ('TEST - Zone C', 303, 3)
) as fixtures(name, delivery_fee, sort)
where not exists (
  select 1 from public.zones zone where zone.name = fixtures.name
);

insert into public.neighborhoods (name, zone_id)
select fixtures.name, zone.id
from (values
  ('TEST - Quartier Alpha', 'TEST - Zone A'),
  ('TEST - Quartier Bêta', 'TEST - Zone A'),
  ('TEST - Quartier Gamma', 'TEST - Zone B'),
  ('TEST - Quartier Delta', 'TEST - Zone B'),
  ('TEST - Quartier Epsilon', 'TEST - Zone C')
) as fixtures(name, zone_name)
join public.zones zone on zone.name = fixtures.zone_name
on conflict (name) do update set zone_id = excluded.zone_id;
