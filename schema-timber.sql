-- =====================================================================
--  Phase 1 — Timber product card, locations & stock-on-hand
--  Run in Neon AFTER schema.sql and schema-crm.sql.
--  Replaces the placeholder `timber_stock` table with a proper product
--  model (dual measurement, GBP costing) + multi-location stock levels.
--  Safe to re-run.
-- =====================================================================

-- Old placeholder master + anything that referenced it. The Phase-2 order
-- line tables referenced timber_stock; CASCADE drops those FK constraints
-- (the line tables themselves are rebuilt when we build orders).
drop table if exists stock_movements cascade;
drop table if exists timber_stock cascade;

-- ---- Locations (stock bins / branches) ------------------------------
create table if not exists locations (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  code       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---- Products (the timber "card") -----------------------------------
create table if not exists products (
  id                bigint generated always as identity primary key,
  code              text not null unique,
  description       text,
  category          text,
  species           text,
  treatment         text,
  stocking_unit     text not null default 'pack',  -- pack | m3 | piece | length | linear_m
  ppp               numeric,                        -- pieces per pack

  -- Selling (nominal/planed) dimensions, mm
  thickness_mm      numeric,
  width_mm          numeric,
  length_mm         numeric,

  -- Purchase (rough-sawn) dimensions, mm — optional, filled later
  purchase_thickness_mm numeric,
  purchase_width_mm     numeric,
  purchase_length_mm    numeric,

  -- Volumes (m³). Generated from the selling dimensions so they always agree.
  piece_volume      numeric generated always as
                      (coalesce(thickness_mm,0) * coalesce(width_mm,0) * coalesce(length_mm,0) / 1000000000.0) stored,
  pack_volume       numeric generated always as
                      (coalesce(thickness_mm,0) * coalesce(width_mm,0) * coalesce(length_mm,0) / 1000000000.0 * coalesce(ppp,0)) stored,

  -- Money (GBP). sell_rate_per_m3 is the master; pack/piece prices derive from it.
  avg_cost_per_m3   numeric,
  sell_rate_per_m3  numeric,

  default_supplier_id bigint references suppliers(id) on delete set null,
  primary_location_id bigint references locations(id) on delete set null,
  tax_rate          text,
  reorder_packs     numeric default 0,
  notes             text,
  created_at        timestamptz not null default now()
);

create unique index if not exists products_code_lower_idx on products (lower(code));

-- ---- Stock on hand, per product per location ------------------------
create table if not exists stock_levels (
  id               bigint generated always as identity primary key,
  product_id       bigint not null references products(id) on delete cascade,
  location_id      bigint not null references locations(id) on delete cascade,
  packs            numeric not null default 0,
  volume_m3        numeric not null default 0,
  avg_cost_per_m3  numeric,
  updated_at       timestamptz not null default now(),
  unique (product_id, location_id)
);

create index if not exists stock_levels_product_idx on stock_levels (product_id);
create index if not exists stock_levels_location_idx on stock_levels (location_id);

-- ---- Stock movements (audit trail), now per product + location ------
create table if not exists stock_movements (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  location_id bigint references locations(id) on delete set null,
  change      numeric not null,              -- +in / -out, in packs
  reason      text not null default 'adjustment', -- purchase | sale | adjustment | correction | transfer
  ref_type    text,
  ref_id      bigint,
  note        text,
  created_by  bigint references users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on stock_movements (product_id);
