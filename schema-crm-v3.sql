-- =====================================================================
--  CRM follow-up — bank & limited-company details
--   Stored on both customers and suppliers. Run in Neon any time after
--   schema-crm.sql. Safe to re-run.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['customers','suppliers'] loop
    execute format('alter table %I add column if not exists company_number      text', t);
    execute format('alter table %I add column if not exists vat_number          text', t);
    execute format('alter table %I add column if not exists registered_name     text', t);
    execute format('alter table %I add column if not exists registered_address  text', t);
    execute format('alter table %I add column if not exists bank_name           text', t);
    execute format('alter table %I add column if not exists bank_account_name   text', t);
    execute format('alter table %I add column if not exists bank_sort_code      text', t);
    execute format('alter table %I add column if not exists bank_account_number text', t);
    execute format('alter table %I add column if not exists bank_iban           text', t);
    execute format('alter table %I add column if not exists bank_bic            text', t);
  end loop;
end $$;
