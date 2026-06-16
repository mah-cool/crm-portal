-- =====================================================================
--  Phase 5 — Per-batch stock (FULL REBUILD)
--   Stock is now tracked per BATCH (a child of a product code, e.g.
--   "9-100 - 700"), each batch with its own PPP and cost. Stock and every
--   document line key off batch_id. Costing is per batch:
--     EUR: £/m³ = (cost_per_m3 / exchange_rate + freight_rate) * (pur/sell area)
--     GBP: £/m³ =  cost_per_m3 * (pur/sell area)   (no exchange, no freight)
--   exchange_rate is € per £ (e.g. 1.15) — DIVIDE.
--
--  ⚠ DESTRUCTIVE: wipes products, batches, stock and ALL documents
--  (orders, picks, deliveries, invoices, POs, loading lists, haulage).
--  Customers, suppliers, hauliers, locations and users are kept.
--  Run ONLY together with the batch-aware app deploy. Re-runnable.
-- =====================================================================
begin;

-- ---- Batches (child of a product code) ------------------------------
create table if not exists product_batches (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references products(id) on delete cascade,
  batch_no      text not null,
  ppp           numeric,
  currency      text not null default 'EUR',   -- EUR | GBP
  cost_per_m3   numeric,                         -- source currency (€/m³ or £/m³)
  exchange_rate numeric,                         -- € per £ (EUR batches; divide)
  freight_rate  numeric,                         -- £/m³ (EUR batches)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (product_id, batch_no)
);
create index if not exists pb_product_idx on product_batches (product_id);

-- A supplier can trade in GBP (no €→£ conversion / freight on its POs).
alter table suppliers add column if not exists currency text not null default 'EUR';

-- ---- Rebuild stock + movements keyed by batch -----------------------
drop table if exists stock_movements cascade;
drop table if exists stock_levels cascade;

create table stock_levels (
  id              bigint generated always as identity primary key,
  batch_id        bigint not null references product_batches(id) on delete cascade,
  location_id     bigint not null references locations(id) on delete cascade,
  packs           numeric not null default 0,
  volume_m3       numeric not null default 0,
  allocated_packs numeric not null default 0,
  avg_cost_per_m3 numeric,
  updated_at      timestamptz not null default now(),
  unique (batch_id, location_id)
);
create index stock_levels_batch_idx on stock_levels (batch_id);
create index stock_levels_location_idx on stock_levels (location_id);

create table stock_movements (
  id          bigint generated always as identity primary key,
  batch_id    bigint references product_batches(id) on delete cascade,
  location_id bigint references locations(id) on delete set null,
  change      numeric not null,
  reason      text not null default 'adjustment',
  ref_type    text,
  ref_id      bigint,
  note        text,
  created_by  bigint references users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index stock_movements_batch_idx on stock_movements (batch_id);

-- ---- Rebuild every document LINE table keyed by batch ---------------
drop table if exists sales_order_lines cascade;
create table sales_order_lines (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references sales_orders(id) on delete cascade,
  line_no       int,
  batch_id      bigint references product_batches(id) on delete set null,
  code          text,
  description   text,
  sell_unit     text not null default 'pack',
  quantity      numeric not null default 0,
  unit_price    numeric not null default 0,
  sell_rate_per_m3 numeric,
  qty_picked    numeric not null default 0,
  qty_delivered numeric not null default 0
);
create index sol_order_idx on sales_order_lines (order_id);

drop table if exists picking_note_lines cascade;
create table picking_note_lines (
  id              bigint generated always as identity primary key,
  picking_note_id bigint not null references picking_notes(id) on delete cascade,
  order_line_id   bigint references sales_order_lines(id) on delete set null,
  batch_id        bigint references product_batches(id) on delete set null,
  code            text,
  description     text,
  qty_to_pick     numeric not null default 0,
  qty_picked      numeric not null default 0
);
create index pnl_note_idx on picking_note_lines (picking_note_id);

drop table if exists delivery_note_lines cascade;
create table delivery_note_lines (
  id               bigint generated always as identity primary key,
  delivery_note_id bigint not null references delivery_notes(id) on delete cascade,
  order_line_id    bigint references sales_order_lines(id) on delete set null,
  picking_note_line_id bigint,
  batch_id         bigint references product_batches(id) on delete set null,
  code             text,
  description      text,
  qty              numeric not null default 0,
  qty_picked       numeric
);
create index dnl_note_idx on delivery_note_lines (delivery_note_id);

drop table if exists invoice_lines cascade;
create table invoice_lines (
  id            bigint generated always as identity primary key,
  invoice_id    bigint not null references invoices(id) on delete cascade,
  order_line_id bigint references sales_order_lines(id) on delete set null,
  batch_id      bigint references product_batches(id) on delete set null,
  code          text,
  description   text,
  quantity      numeric not null default 0,
  unit_price    numeric not null default 0,
  net           numeric not null default 0
);
create index il_invoice_idx on invoice_lines (invoice_id);

drop table if exists purchase_order_lines cascade;
create table purchase_order_lines (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references purchase_orders(id) on delete cascade,
  line_no     int,
  batch_id    bigint references product_batches(id) on delete set null,
  code        text,
  description text,
  quantity    numeric not null default 0,
  cost_per_m3 numeric not null default 0,   -- source currency (€ or £ per m³)
  qty_loaded  numeric not null default 0
);
create index pol_order_idx on purchase_order_lines (order_id);

-- customer stock-list selections move to batch level
drop table if exists customer_stock_list_items cascade;
create table customer_stock_list_items (
  id         bigint generated always as identity primary key,
  list_id    bigint not null references customer_stock_lists(id) on delete cascade,
  batch_id   bigint not null references product_batches(id) on delete cascade
);
create index csli_list_idx on customer_stock_list_items (list_id);

drop table if exists loading_list_lines cascade;
create table loading_list_lines (
  id              bigint generated always as identity primary key,
  loading_list_id bigint not null references loading_lists(id) on delete cascade,
  po_line_id      bigint references purchase_order_lines(id) on delete set null,
  batch_id        bigint references product_batches(id) on delete set null,
  code            text,
  description     text,
  quantity        numeric not null default 0,
  cost_per_m3     numeric not null default 0
);
create index lll_list_idx on loading_list_lines (loading_list_id);

-- ---- Wipe document headers + product master ------------------------
truncate haulage_order_drops, haulage_orders,
         loading_lists, purchase_orders,
         invoices, delivery_notes, picking_notes, sales_orders
  restart identity cascade;
truncate customer_stock_list_items, customer_stock_lists restart identity cascade;
truncate products restart identity cascade;   -- cascades to product_batches + stock

commit;

-- ---- Convenience view: batch + product dims + computed cost ----------
-- pack_volume = selling dims × batch PPP; area_ratio = purchase ÷ selling
-- (thickness×width — length & PPP cancel); landed_cost_per_m3 in £.
create or replace view batch_view as
select t.*,
  case when t.currency = 'GBP'
       then coalesce(t.cost_per_m3,0) * t.area_ratio
       else (coalesce(t.cost_per_m3,0) / nullif(t.exchange_rate,0) + coalesce(t.freight_rate,0)) * t.area_ratio
  end as landed_cost_per_m3
from (
  select b.id, b.product_id, b.batch_no, b.ppp, b.currency, b.cost_per_m3,
         b.exchange_rate, b.freight_rate, b.active,
         p.code, p.description, p.species, p.sell_rate_per_m3,
         p.thickness_mm, p.width_mm, p.length_mm,
         p.purchase_thickness_mm, p.purchase_width_mm, p.purchase_length_mm,
         (coalesce(p.thickness_mm,0) * coalesce(p.width_mm,0) * coalesce(p.length_mm,0)
            / 1000000000.0 * coalesce(b.ppp,0)) as pack_volume,
         case when coalesce(p.thickness_mm,0) * coalesce(p.width_mm,0) > 0
              then (coalesce(p.purchase_thickness_mm,0) * coalesce(p.purchase_width_mm,0))::numeric
                   / (p.thickness_mm * p.width_mm)
              else 0 end as area_ratio
  from product_batches b join products p on p.id = b.product_id
) t;
