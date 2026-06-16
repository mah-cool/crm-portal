-- =====================================================================
--  Phase 3 — Haulage orders (multi-drop)
--   * stock locations gain an optional postal address (ships have none;
--     real yards like Sutton Bridge / Wisbech do, for collection points)
--   * a haulage order groups one or more SPN picking notes as ordered
--     "drops" for multi-drop deliveries, each with its own nett cost
--   * haulier moves OFF the sales order — it now lives on the haulage order
--  Run in Neon AFTER schema-orders-v2.sql. Safe to re-run.
-- =====================================================================

-- ---- Locations: optional collection address -------------------------
alter table locations add column if not exists address  text;
alter table locations add column if not exists city     text;
alter table locations add column if not exists postcode text;

-- ---- Document numbering ----------------------------------------------
insert into doc_sequences (doc_type, prefix, next_value) values
  ('haulage_order', 'HO', 1)
on conflict (doc_type) do nothing;

-- ---- Haulage orders --------------------------------------------------
create table if not exists haulage_orders (
  id             bigint generated always as identity primary key,
  number         text unique,
  haulier_id     bigint references hauliers(id) on delete set null,
  status         text not null default 'open',   -- open | sent | completed | cancelled
  scheduled_date date,
  vat_rate       numeric not null default 20,
  notes          text,
  created_by     bigint references users(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- Each drop links ONE picking note to the haulage order, in drop order.
-- Collection address derives from the pick note's location; the delivery
-- address derives from the pick note's sales order.
create table if not exists haulage_order_drops (
  id               bigint generated always as identity primary key,
  haulage_order_id bigint not null references haulage_orders(id) on delete cascade,
  picking_note_id  bigint references picking_notes(id) on delete set null,
  drop_no          int not null default 1,
  nett_cost        numeric not null default 0,
  notes            text
);
create index if not exists hod_order_idx on haulage_order_drops (haulage_order_id);
