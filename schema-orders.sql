-- =====================================================================
--  Phase 2 — Order to cash
--  Sales Order -> Picking Note -> Delivery Note -> Invoice
--  Run in Neon AFTER schema-timber.sql. Safe to re-run.
-- =====================================================================

-- Remove the placeholder order tables from schema-crm.sql and rebuild
-- them properly (referencing products + locations + the new doc chain).
drop table if exists invoice_lines, invoices,
  delivery_note_lines, delivery_notes, deliveries,
  picking_note_lines, picking_notes,
  sales_order_lines, sales_orders cascade;

-- ---- Document numbering ---------------------------------------------
-- One row per document type. nextNumber() bumps next_value atomically.
create table if not exists doc_sequences (
  doc_type   text primary key,           -- sales_order | picking_note | delivery_note | invoice
  prefix     text not null,
  next_value bigint not null
);

insert into doc_sequences (doc_type, prefix, next_value) values
  ('sales_order',   'SO',  7959),
  ('picking_note',  'SPN', 15024),
  ('delivery_note', 'DN',  24422),
  ('invoice',       'INV', 1)
on conflict (doc_type) do nothing;

-- ---- Sales orders ----------------------------------------------------
create table if not exists sales_orders (
  id               bigint generated always as identity primary key,
  number           text unique,
  customer_id      bigint references customers(id) on delete set null,
  order_type       text not null default 'delivery',   -- delivery | collect
  status           text not null default 'open',        -- open | part_picked | picked | part_delivered | delivered | invoiced | cancelled
  customer_ref     text,
  order_date       date not null default current_date,
  due_date         date,
  haulier_id       bigint references hauliers(id) on delete set null,
  location_id      bigint references locations(id) on delete set null,  -- default fulfil-from
  delivery_name    text,
  delivery_address text,
  delivery_city    text,
  delivery_postcode text,
  vat_rate         numeric not null default 20,
  notes            text,
  created_by       bigint references users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create table if not exists sales_order_lines (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references sales_orders(id) on delete cascade,
  line_no       int,
  product_id    bigint references products(id) on delete set null,
  code          text,
  description   text,
  sell_unit     text not null default 'pack',
  quantity      numeric not null default 0,   -- ordered
  unit_price    numeric not null default 0,   -- £ per sell_unit
  qty_picked    numeric not null default 0,
  qty_delivered numeric not null default 0
);
create index if not exists sol_order_idx on sales_order_lines (order_id);

-- ---- Picking notes ---------------------------------------------------
create table if not exists picking_notes (
  id           bigint generated always as identity primary key,
  number       text unique,
  order_id     bigint not null references sales_orders(id) on delete cascade,
  location_id  bigint references locations(id) on delete set null,  -- pick from
  status       text not null default 'open',   -- open | confirmed | cancelled
  picker       text,
  notes        text,
  created_by   bigint references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists picking_note_lines (
  id            bigint generated always as identity primary key,
  picking_note_id bigint not null references picking_notes(id) on delete cascade,
  order_line_id bigint references sales_order_lines(id) on delete set null,
  product_id    bigint references products(id) on delete set null,
  code          text,
  description   text,
  qty_to_pick   numeric not null default 0,
  qty_picked    numeric not null default 0
);
create index if not exists pnl_note_idx on picking_note_lines (picking_note_id);

-- ---- Delivery notes --------------------------------------------------
create table if not exists delivery_notes (
  id             bigint generated always as identity primary key,
  number         text unique,
  order_id       bigint not null references sales_orders(id) on delete cascade,
  haulier_id     bigint references hauliers(id) on delete set null,
  location_id    bigint references locations(id) on delete set null,  -- deliver from
  status         text not null default 'open',   -- open | confirmed | cancelled
  delivery_name  text,
  delivery_address text,
  delivery_city  text,
  delivery_postcode text,
  scheduled_date date,
  delivered_date date,
  notes          text,
  created_by     bigint references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  confirmed_at   timestamptz
);

create table if not exists delivery_note_lines (
  id              bigint generated always as identity primary key,
  delivery_note_id bigint not null references delivery_notes(id) on delete cascade,
  order_line_id   bigint references sales_order_lines(id) on delete set null,
  product_id      bigint references products(id) on delete set null,
  code            text,
  description     text,
  qty             numeric not null default 0
);
create index if not exists dnl_note_idx on delivery_note_lines (delivery_note_id);

-- ---- Invoices --------------------------------------------------------
create table if not exists invoices (
  id           bigint generated always as identity primary key,
  number       text unique,
  order_id     bigint references sales_orders(id) on delete set null,
  customer_id  bigint references customers(id) on delete set null,
  status       text not null default 'draft',   -- draft | issued | paid | cancelled
  invoice_date date not null default current_date,
  vat_rate     numeric not null default 20,
  net          numeric not null default 0,
  vat          numeric not null default 0,
  gross        numeric not null default 0,
  notes        text,
  created_by   bigint references users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists invoice_lines (
  id            bigint generated always as identity primary key,
  invoice_id    bigint not null references invoices(id) on delete cascade,
  order_line_id bigint references sales_order_lines(id) on delete set null,
  product_id    bigint references products(id) on delete set null,
  code          text,
  description   text,
  quantity      numeric not null default 0,
  unit_price    numeric not null default 0,
  net           numeric not null default 0
);
create index if not exists il_invoice_idx on invoice_lines (invoice_id);
