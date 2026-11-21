begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

select has_column('public', 'partners', 'is_demo', 'partners have a demo marker');
select has_column('public', 'products', 'is_demo', 'products have a demo marker');

insert into public.partners (slug, type, name)
values ('test-demo-marker', 'restaurant', 'TEST - Demo marker');

insert into public.products (partner_id, slug, name, price)
select id, 'test-demo-product', '{"fr":"TEST - Produit","en":"TEST - Product"}', 1000
from public.partners
where slug = 'test-demo-marker';

select is(
  (select is_demo from public.partners where slug = 'test-demo-marker'),
  false,
  'catalogue entries are not marked as demo unless explicitly seeded as demo'
);
select is(
  (select product.is_demo
   from public.products product
   join public.partners partner on partner.id = product.partner_id
   where partner.slug = 'test-demo-marker'
     and product.slug = 'test-demo-product'),
  false,
  'products are not marked as demo unless explicitly seeded as demo'
);

select * from finish();
rollback;
