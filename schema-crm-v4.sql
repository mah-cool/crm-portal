-- =====================================================================
--  Credit control (basics) — per customer
--   Just stores the limit and terms for now; nothing consumes them yet.
--   Run in Neon any time after schema-crm.sql. Safe to re-run.
-- =====================================================================

alter table customers add column if not exists credit_limit numeric;   -- £
alter table customers add column if not exists credit_terms text;       -- e.g. "30 days", "EOM"
