-- =====================================================================
--  Accounts & credit control
--   * structured credit terms on customers (N days, optional end-of-month)
--   * invoices gain a due date + amount paid (status -> part_paid / paid)
--   * customer receipts allocated across one or more invoices
--  Run in Neon after schema-orders.sql / schema-crm-v4.sql. Safe to re-run.
-- =====================================================================

-- Structured credit terms (replaces the free-text credit_terms for the maths)
alter table customers add column if not exists credit_terms_days numeric not null default 30;
alter table customers add column if not exists credit_terms_eom  boolean not null default false;

-- Invoice balances + due date
alter table invoices add column if not exists due_date    date;
alter table invoices add column if not exists amount_paid numeric not null default 0;

-- A customer receipt (cash in), allocated across invoices.
create table if not exists customer_payments (
  id           bigint generated always as identity primary key,
  customer_id  bigint references customers(id) on delete set null,
  amount       numeric not null default 0,
  payment_date date not null default current_date,
  method       text,
  reference    text,
  notes        text,
  created_by   bigint references users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists payment_allocations (
  id         bigint generated always as identity primary key,
  payment_id bigint not null references customer_payments(id) on delete cascade,
  invoice_id bigint not null references invoices(id) on delete cascade,
  amount     numeric not null default 0
);
create index if not exists pa_payment_idx on payment_allocations (payment_id);
create index if not exists pa_invoice_idx on payment_allocations (invoice_id);
