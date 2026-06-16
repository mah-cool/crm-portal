-- =====================================================================
--  Phase 4 — Purchasing & inbound voyages
--   Purchase order (to supplier, purchase dimensions only, priced €/m³)
--     -> Loading list (stock loaded onto a vessel in Riga; confirming it
--        creates a per-voyage transit stock bin and draws down the PO)
--     -> Arrival at destination port (Wisbech / Sutton Bridge).
--
--  Costing: suppliers price in €/m³ against PURCHASE dimensions. Landed
--  £/m³ against the SELLING size is:
--     eur_per_m3 * (purchase_pack_volume / pack_volume) * exchange_rate
--        + freight_rate   (£/m³)
--  exchange_rate (£ per €) values in-transit stock at load; freight_rate
--  is added at arrival to give the final landed cost at the port bin.
--  Run in Neon AFTER schema-orders-v3.sql. Safe to re-run.
-- =====================================================================

-- Flag transit/vessel bins so they can be told apart from real yards.
alter table locations add column if not exists is_transit boolean not null default false;

-- Purchase-size pack volume (m³), generated from the rough-sawn dimensions.
alter table products add column if not exists purchase_pack_volume numeric generated always as
  (coalesce(purchase_thickness_mm,0) * coalesce(purchase_width_mm,0) * coalesce(purchase_length_mm,0)
     / 1000000000.0 * coalesce(ppp,0)) stored;

insert into doc_sequences (doc_type, prefix, next_value) values
  ('purchase_order', 'PO', 1),
  ('loading_list',   'LL', 1)
on conflict (doc_type) do nothing;

-- schema-crm.sql created placeholder purchase_orders/_lines with a different
-- shape (reference/po_id/stock_id, no `number`). They were never wired into
-- the app, so drop and rebuild them properly here. CASCADE clears the old FKs.
drop table if exists loading_list_lines, loading_lists,
  purchase_order_lines, purchase_orders cascade;

-- ---- Purchase orders -------------------------------------------------
create table if not exists purchase_orders (
  id            bigint generated always as identity primary key,
  number        text unique,
  supplier_id   bigint references suppliers(id) on delete set null,
  status        text not null default 'open',   -- open | part_loaded | loaded | cancelled
  order_date    date not null default current_date,
  expected_date date,
  supplier_ref  text,
  notes         text,
  created_by    bigint references users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists purchase_order_lines (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references purchase_orders(id) on delete cascade,
  line_no     int,
  product_id  bigint references products(id) on delete set null,
  code        text,
  description text,
  quantity    numeric not null default 0,   -- packs ordered
  eur_per_m3  numeric not null default 0,   -- supplier price, €/m³ of PURCHASE volume
  qty_loaded  numeric not null default 0    -- packs already drawn onto vessels
);
create index if not exists pol_order_idx on purchase_order_lines (order_id);

-- ---- Loading lists (one per vessel voyage) --------------------------
create table if not exists loading_lists (
  id            bigint generated always as identity primary key,
  number        text unique,
  vessel_name   text,
  voyage_ref    text,
  status        text not null default 'open',   -- open | loaded | arrived | cancelled
  location_id   bigint references locations(id) on delete set null,  -- the transit bin (set on load)
  exchange_rate numeric,                          -- £ per € used to value the voyage
  freight_rate  numeric,                          -- £/m³ added at arrival
  load_date     date,
  eta_date      date,
  notes         text,
  created_by    bigint references users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists loading_list_lines (
  id              bigint generated always as identity primary key,
  loading_list_id bigint not null references loading_lists(id) on delete cascade,
  po_line_id      bigint references purchase_order_lines(id) on delete set null,
  product_id      bigint references products(id) on delete set null,
  code            text,
  description     text,
  quantity        numeric not null default 0,   -- packs loaded onto the vessel
  eur_per_m3      numeric not null default 0    -- €/m³ snapshot from the PO line
);
create index if not exists lll_list_idx on loading_list_lines (loading_list_id);
