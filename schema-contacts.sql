-- =====================================================================
--  Multiple contacts per customer / supplier
--   A company can have several contacts (accounts, sales, purchasing…).
--   Polymorphic: partner_type is 'customers' or 'suppliers'.
--   Run in Neon any time after schema-crm.sql. Safe to re-run.
-- =====================================================================

create table if not exists partner_contacts (
  id           bigint generated always as identity primary key,
  partner_type text not null,            -- customers | suppliers
  partner_id   bigint not null,
  name         text,
  role         text,                      -- e.g. Accounts, Sales, Purchasing
  email        text,
  phone        text,
  notes        text,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists pc_partner_idx on partner_contacts (partner_type, partner_id);
