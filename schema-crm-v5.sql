-- =====================================================================
--  CRM — sales rep per customer
--   Each customer is owned by a staff member (sales rep). The customers
--   list sorts each rep's own customers to the top, then by who was
--   contacted longest ago (next to call). Run after schema-crm.sql.
-- =====================================================================

alter table customers add column if not exists sales_rep_id bigint references users(id) on delete set null;
create index if not exists customers_rep_idx on customers (sales_rep_id);
