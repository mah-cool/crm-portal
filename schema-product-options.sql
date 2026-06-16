-- =====================================================================
--  Product option lists — category / species / treatment
--   These were free-text on products; they become managed drop-down
--   lists so data stays consistent, with the option to add new values
--   on the fly. Run in Neon any time after schema-timber.sql. Re-runnable.
-- =====================================================================

create table if not exists product_options (
  id    bigint generated always as identity primary key,
  field text not null,            -- category | species | treatment
  value text not null,
  unique (field, value)
);

-- Seed the lists from whatever distinct values already exist on products.
insert into product_options (field, value)
  select 'category', category from products
  where category is not null and btrim(category) <> '' group by category
on conflict (field, value) do nothing;

insert into product_options (field, value)
  select 'species', species from products
  where species is not null and btrim(species) <> '' group by species
on conflict (field, value) do nothing;

insert into product_options (field, value)
  select 'treatment', treatment from products
  where treatment is not null and btrim(treatment) <> '' group by treatment
on conflict (field, value) do nothing;
