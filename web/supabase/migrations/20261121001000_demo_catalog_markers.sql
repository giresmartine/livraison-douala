alter table public.partners
  add column is_demo boolean not null default false;

alter table public.products
  add column is_demo boolean not null default false;
