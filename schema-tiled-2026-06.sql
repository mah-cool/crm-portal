-- =====================================================================
--  Tiled rebuild — June 2026 feature batch
--  Adds: manual-cost column on stock movements, and a daily stock-value
--  snapshot table for Stock Reports. Safe to re-run.
--
--  Run this in the Neon SQL editor on the crm-portal branch.
-- =====================================================================

-- ---- Feature 6: record a manually-entered cost on a stock movement ---
alter table stock_movements
  add column if not exists unit_cost_per_m3 numeric;

-- Faster ordering for the stock movements ledger (Feature 5).
create index if not exists stock_movements_created_idx
  on stock_movements (created_at desc);

-- ---- Feature 7: daily snapshot of total stock value ------------------
create table if not exists stock_value_snapshots (
  snapshot_date  date primary key,
  total_packs    numeric not null default 0,
  total_volume_m3 numeric not null default 0,
  total_value    numeric not null default 0,
  created_at     timestamptz not null default now()
);
