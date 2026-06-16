-- =====================================================================
--  CRM follow-up — default VAT rate per trading partner
--   The VAT rate is no longer entered per sales order; it is configured
--   on the customer (and supplier) and snapshotted onto the order when
--   it is raised. Run in Neon any time after schema-crm.sql. Safe to re-run.
-- =====================================================================

alter table customers add column if not exists vat_rate numeric not null default 20;
alter table suppliers add column if not exists vat_rate numeric not null default 20;
