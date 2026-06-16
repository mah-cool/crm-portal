-- =====================================================================
--  Sales-order write-offs
--   Record why outstanding (un-picked) order balance is written off
--   — lost order, office amendment, customer change, etc. The order
--   line quantity is reduced; this table keeps the audit trail.
--   Run in Neon any time after schema-orders.sql. Safe to re-run.
-- =====================================================================

create table if not exists order_write_offs (
  id            bigint generated always as identity primary key,
  order_id      bigint references sales_orders(id) on delete cascade,
  order_line_id bigint,
  batch_id      bigint references product_batches(id) on delete set null,
  code          text,
  quantity      numeric not null default 0,
  reason        text,
  note          text,
  created_by    bigint references users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists owo_order_idx on order_write_offs (order_id);
