// Document numbering + shared helpers for the order-to-cash chain.
import { sql } from './_lib.js';

// Atomically reserve and return the next document number, e.g. "SO7959".
export async function nextNumber(docType) {
  const rows = await sql`
    update doc_sequences set next_value = next_value + 1
    where doc_type = ${docType}
    returning prefix, (next_value - 1) as value
  `;
  if (!rows.length) throw new Error('No number sequence for ' + docType);
  return rows[0].prefix + rows[0].value;
}

// Recompute and persist a sales order's status from its line quantities.
export async function refreshOrderStatus(orderId) {
  const lines = await sql`
    select quantity, qty_picked, qty_delivered from sales_order_lines where order_id = ${orderId}
  `;
  if (!lines.length) return;
  const sum = (f) => lines.reduce((a, l) => a + Number(l[f] || 0), 0);
  const ordered = sum('quantity'), picked = sum('qty_picked'), delivered = sum('qty_delivered');

  let status;
  const cur = await sql`select status from sales_orders where id = ${orderId}`;
  if (cur.length && (cur[0].status === 'cancelled' || cur[0].status === 'invoiced')) return; // terminal

  if (delivered >= ordered && ordered > 0) status = 'delivered';
  else if (delivered > 0) status = 'part_delivered';
  else if (picked >= ordered && ordered > 0) status = 'picked';
  else if (picked > 0) status = 'part_picked';
  else status = 'open';

  await sql`update sales_orders set status = ${status} where id = ${orderId}`;
  return status;
}
