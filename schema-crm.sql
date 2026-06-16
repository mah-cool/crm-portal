-- =====================================================================
--  Timber CRM + Stock Management — database schema
--  Run this in the Neon SQL Editor AFTER schema.sql (which creates users).
--  Safe to run more than once (idempotent).
-- =====================================================================

-- ---- Users: add role + active flag ----------------------------------
alter table users add column if not exists role   text    not null default 'staff';   -- 'admin' | 'staff'
alter table users add column if not exists active boolean not null default true;

-- ---- Master data ----------------------------------------------------
create table if not exists customers (
  id           bigint generated always as identity primary key,
  name         text not null,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  city         text,
  postcode     text,
  account_no   text,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists suppliers (
  id           bigint generated always as identity primary key,
  name         text not null,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  city         text,
  postcode     text,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists hauliers (
  id            bigint generated always as identity primary key,
  name          text not null,
  contact_name  text,
  phone         text,
  email         text,
  vehicle_types text,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists timber_stock (
  id            bigint generated always as identity primary key,
  sku           text,
  species       text not null,
  grade         text,
  treatment     text,
  description   text,
  length_mm     numeric,
  width_mm      numeric,
  thickness_mm  numeric,
  unit          text not null default 'm3',   -- m3 | pack | length | linear_m | piece
  quantity      numeric not null default 0,
  unit_cost     numeric,
  unit_price    numeric,
  location      text,
  supplier_id   bigint references suppliers(id) on delete set null,
  reorder_level numeric default 0,
  created_at    timestamptz not null default now()
);

-- ---- Transactions (schema now; UI added in the next phase) ----------
create table if not exists purchase_orders (
  id            bigint generated always as identity primary key,
  reference     text,
  supplier_id   bigint references suppliers(id) on delete set null,
  status        text not null default 'draft', -- draft | ordered | received | cancelled
  order_date    date,
  expected_date date,
  notes         text,
  created_by    bigint references users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists purchase_order_lines (
  id          bigint generated always as identity primary key,
  po_id       bigint not null references purchase_orders(id) on delete cascade,
  stock_id    bigint references timber_stock(id) on delete set null,
  description text,
  quantity    numeric not null default 0,
  unit        text,
  unit_cost   numeric
);

create table if not exists sales_orders (
  id            bigint generated always as identity primary key,
  reference     text,
  customer_id   bigint references customers(id) on delete set null,
  haulier_id    bigint references hauliers(id) on delete set null,
  status        text not null default 'draft', -- draft | confirmed | dispatched | delivered | cancelled
  order_date    date,
  delivery_date date,
  notes         text,
  created_by    bigint references users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists sales_order_lines (
  id          bigint generated always as identity primary key,
  so_id       bigint not null references sales_orders(id) on delete cascade,
  stock_id    bigint references timber_stock(id) on delete set null,
  description text,
  quantity    numeric not null default 0,
  unit        text,
  unit_price  numeric
);

create table if not exists deliveries (
  id             bigint generated always as identity primary key,
  reference      text,
  sales_order_id bigint references sales_orders(id) on delete set null,
  haulier_id     bigint references hauliers(id) on delete set null,
  status         text not null default 'scheduled', -- scheduled | in_transit | delivered | failed
  scheduled_date date,
  delivered_date date,
  notes          text,
  created_at     timestamptz not null default now()
);

-- Every change in stock level is recorded here (audit trail).
create table if not exists stock_movements (
  id         bigint generated always as identity primary key,
  stock_id   bigint not null references timber_stock(id) on delete cascade,
  change     numeric not null,              -- +in / -out
  reason     text not null default 'adjustment', -- purchase | sale | adjustment | correction
  ref_type   text,
  ref_id     bigint,
  note       text,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_stock_idx on stock_movements (stock_id);

-- =====================================================================
--  Seed placeholder data (only if the tables are empty)
-- =====================================================================
insert into customers (name, contact_name, email, phone, city, postcode, account_no)
select * from (values
  ('Oakfield Builders Ltd', 'Sarah Hughes',  'sarah@oakfieldbuilders.co.uk', '0161 555 0101', 'Manchester', 'M1 2AB', 'CUST-001'),
  ('Pennine Joinery',       'Tom Whitaker',  'tom@penninejoinery.co.uk',     '0113 555 0142', 'Leeds',      'LS1 4ST', 'CUST-002'),
  ('Riverside Developments','Aisha Khan',    'aisha@riversidedev.co.uk',     '0117 555 0188', 'Bristol',    'BS1 5TR', 'CUST-003')
) as v(name, contact_name, email, phone, city, postcode, account_no)
where not exists (select 1 from customers);

insert into suppliers (name, contact_name, email, phone, city, postcode)
select * from (values
  ('Baltic Timber Imports',  'Lars Andersen', 'sales@baltictimber.com',    '020 7555 0199', 'London',     'E16 2QU'),
  ('Highland Sawmills',      'Grant McLeod',  'orders@highlandsawmills.co.uk','01463 555012', 'Inverness',  'IV1 1AA'),
  ('Severn Valley Forestry', 'Megan Price',   'info@severnvalleyforestry.co.uk','01452 555077','Gloucester','GL1 3DT')
) as v(name, contact_name, email, phone, city, postcode)
where not exists (select 1 from suppliers);

insert into hauliers (name, contact_name, phone, email, vehicle_types)
select * from (values
  ('[Company Name] Transport', 'In-house',       '[phone]',        '[email]',                 'Curtainside, Flatbed'),
  ('Northern Freight Co',      'Dave Sutton',    '0191 555 0123',  'dave@northernfreight.co.uk','Artic, Hiab'),
  ('Crane & Co Logistics',     'Priya Patel',    '0121 555 0166',  'priya@craneco.co.uk',       'Flatbed, Moffett')
) as v(name, contact_name, phone, email, vehicle_types)
where not exists (select 1 from hauliers);

insert into timber_stock (sku, species, grade, treatment, description, length_mm, width_mm, thickness_mm, unit, quantity, unit_cost, unit_price, location, supplier_id, reorder_level)
select
  v.sku, v.species, v.grade, v.treatment, v.description,
  v.length_mm, v.width_mm, v.thickness_mm, v.unit, v.quantity,
  v.unit_cost, v.unit_price, v.location,
  (select id from suppliers order by id limit 1), v.reorder_level
from (values
  ('TS-C16-47150', 'Whitewood (Spruce)', 'C16', 'Kiln-dried',  'Structural CLS studwork', 4800, 150, 47, 'length', 320, 6.20, 9.50, 'Rack A1', 40),
  ('TS-C24-47225', 'Redwood (Pine)',     'C24', 'Treated',     'Treated carcassing',      4800, 225, 47, 'length', 140, 11.40, 16.80, 'Rack A3', 30),
  ('TS-OAK-EU',    'European Oak',        'PAR', 'None',        'Prime oak boards',         3000, 200, 27, 'm3',     8.5, 980.00, 1450.00, 'Bay B2', 2),
  ('TS-PLY-18',    'Birch Plywood',       'BB/BB','None',       '18mm structural plywood',  2440, 1220, 18, 'pack',   24, 38.00, 54.00, 'Shelf C1', 6),
  ('TS-DECK-32',   'Softwood Decking',    'Premium','Treated',  'Grooved deck board',       3600, 144, 32, 'linear_m', 1850, 1.95, 3.40, 'Yard D', 400)
) as v(sku, species, grade, treatment, description, length_mm, width_mm, thickness_mm, unit, quantity, unit_cost, unit_price, location, reorder_level)
where not exists (select 1 from timber_stock);
