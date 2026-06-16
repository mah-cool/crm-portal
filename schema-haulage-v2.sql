-- =====================================================================
--  Haulage follow-up — separate collection & delivery dates
--   A haulage order now carries both the collection date (loaded at the
--   port) and the delivery date, replacing the single scheduled_date.
--   Run in Neon after schema-haulage.sql. Safe to re-run.
-- =====================================================================

alter table haulage_orders add column if not exists collection_date date;
alter table haulage_orders add column if not exists delivery_date   date;
