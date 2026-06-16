-- =====================================================================
--  Phase 2 follow-up — delivery notes, invoices & stock allocation
--   * stock now moves only at DELIVERY (loaded onto the truck), not at
--     picking. Picking is a reservation: stock_levels.allocated_packs
--     tracks picked-but-not-yet-delivered packs so available = packs -
--     allocated, stopping sales from over-selling.
--   * a delivery note is raised FROM a confirmed picking note; the loaded
--     quantity is amendable (timber weight varies) before finance checks
--     it and raises an invoice PER delivery note.
--  Run in Neon AFTER schema-orders-v2.sql. Safe to re-run.
-- =====================================================================

-- ---- Stock: reserved (picked, not yet loaded) packs -----------------
alter table stock_levels add column if not exists allocated_packs numeric not null default 0;

-- ---- Delivery notes: trace back to the source picking note ----------
alter table delivery_notes      add column if not exists picking_note_id      bigint references picking_notes(id) on delete set null;
alter table delivery_note_lines add column if not exists picking_note_line_id bigint;
-- snapshot of the picked/allocated qty so we can release the reservation
-- exactly, even after the loaded qty is amended.
alter table delivery_note_lines add column if not exists qty_picked numeric;

-- ---- Invoices: raised per delivery note -----------------------------
alter table invoices add column if not exists delivery_note_id bigint references delivery_notes(id) on delete set null;
