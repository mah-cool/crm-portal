-- =====================================================================
--  Customer stock lists
--   Saved selections of product codes per customer, used to quickly
--   generate a stock list (current availability) to export to Excel and
--   send to that customer. Run in Neon after schema-timber.sql / schema-crm.sql.
--   Safe to re-run.
-- =====================================================================

create table if not exists customer_stock_lists (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  name        text not null,
  created_by  bigint references users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists csl_customer_idx on customer_stock_lists (customer_id);

create table if not exists customer_stock_list_items (
  id         bigint generated always as identity primary key,
  list_id    bigint not null references customer_stock_lists(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade
);
create index if not exists csli_list_idx on customer_stock_list_items (list_id);
