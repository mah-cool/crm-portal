-- =====================================================================
--  Customer interaction log — calls, emails, visits, notes
--   Gives the whole sales team visibility of every communication with a
--   customer. Run in Neon any time after schema-crm.sql. Safe to re-run.
-- =====================================================================

create table if not exists customer_interactions (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  type        text not null default 'note',   -- call | email | visit | note
  subject     text,
  body        text,
  created_by  bigint references users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists ci_customer_idx on customer_interactions (customer_id, created_at desc);
