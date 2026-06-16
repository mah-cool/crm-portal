-- =====================================================================
--  Reports — saved report definitions
--   Built-in report types (write-offs, stock valuation) are produced by
--   the app; users can save configured copies (a base type + preset
--   parameters) which show in the Report manager. Run after schema.sql.
-- =====================================================================

create table if not exists report_defs (
  id         bigint generated always as identity primary key,
  name       text not null,
  type       text not null,        -- writeoffs | stock_valuation | …
  params     jsonb,                -- preset parameters
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);
