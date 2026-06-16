-- =====================================================================
--  June 2026 batch of changes (quick wins)
--   #1 instructions on pick notes & haulage orders
--   #6 haulier location (city / county / postcode)
--   #10 single permanent "On the water" transit bin (no per-voyage bins)
--  Run in Neon after schema-purchasing.sql (needs locations.is_transit).
--  Safe to re-run.
-- =====================================================================

-- #1 — printable instructions
alter table picking_notes  add column if not exists instructions text;
alter table haulage_orders add column if not exists instructions text;

-- #6 — identify hauliers by location
alter table hauliers add column if not exists city     text;
alter table hauliers add column if not exists county   text;
alter table hauliers add column if not exists postcode text;

-- #10 — one permanent transit location for stock at sea
insert into locations (name, code, is_transit, active)
values ('On the water', 'WATER', true, true)
on conflict (name) do nothing;
