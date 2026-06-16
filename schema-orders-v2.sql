-- =====================================================================
--  Phase 2 follow-up
--   * multiple delivery addresses per customer
--   * sell sales-order lines by £/m³ (rate stored per line)
--  Run in Neon AFTER schema-orders.sql. Safe to re-run.
-- =====================================================================

create table if not exists customer_addresses (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  label       text,            -- e.g. "Head office", "Yard 2"
  name        text,
  address     text,
  city        text,
  postcode    text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ca_customer_idx on customer_addresses (customer_id);

-- Sales order lines: keep the £/m³ rate the salesperson quoted.
-- unit_price stays as the derived £ per pack so existing net maths still hold.
alter table sales_order_lines add column if not exists sell_rate_per_m3 numeric;
