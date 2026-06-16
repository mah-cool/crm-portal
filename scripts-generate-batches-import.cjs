// One-off: parse the stock CSV -> import-batches.sql (products + batches + stock).
// Run: node scripts-generate-batches-import.js "<path-to-csv>"
const fs = require('fs');
const CSV = process.argv[2] || 'C:/Users/m_sau/OneDrive/Desktop/Stock List (UD1334) (1) - Stock List (UD1334) (1).csv';
const OUT = 'import-batches.sql';
const EXCHANGE = 1.15;   // € per £ (divide)
const FREIGHT = 45;      // £/m³

function parse(t) {
  const rows = []; let f = '', row = [], q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\r') {}
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const num = (s) => { const n = Number(String(s == null ? '' : s).replace(/,/g, '').trim()); return Number.isFinite(n) ? n : null; };
const q = (s) => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const qn = (n) => n == null ? 'null' : String(n);

const rows = parse(fs.readFileSync(CSV, 'utf8')).filter(r => r.some(x => x.trim() !== ''));
const data = rows.slice(1);   // drop header

const products = new Map();   // code -> dims
const batches = new Map();    // code||batch_no -> {code,batch_no,ppp,cost}
const stock = [];             // {code,batch_no,bin,packs,vol,landed}

data.forEach(r => {
  const code = r[0].trim(), bin = r[1].trim(), batch = r[2].trim();
  if (!code || !bin || !batch) return;
  const purT = num(r[3]), purW = num(r[4]), selT = num(r[5]), selW = num(r[6]), len = num(r[7]);
  const ppp = num(r[8]), packs = num(r[9]) || 0, vol = num(r[10]) || 0, cost = num(r[11]);
  if (!products.has(code)) products.set(code, { selT, selW, len, purT, purW });
  const bkey = code + '||' + batch;
  if (!batches.has(bkey)) batches.set(bkey, { code, batch_no: batch, ppp, cost });
  // landed £/m³ (EUR): (cost/exchange + freight) * (purArea/sellArea)
  const ratio = (selT && selW) ? (purT * purW) / (selT * selW) : 0;
  const landed = cost != null ? (cost / EXCHANGE + FREIGHT) * ratio : null;
  stock.push({ code, batch_no: batch, bin, packs, vol, landed: landed != null ? Math.round(landed * 100) / 100 : null });
});

let sql = '-- Generated from the stock CSV. Run AFTER schema-batches.sql.\n';
sql += '-- EUR exchange ' + EXCHANGE + ' (€/£), freight £' + FREIGHT + '/m³. Re-runnable.\nbegin;\n\n';

const bins = [...new Set(data.map(r => r[1].trim()).filter(Boolean))];
sql += '-- locations\n';
bins.forEach(b => { sql += "insert into locations (name, active) values (" + q(b) + ", true) on conflict (name) do nothing;\n"; });

sql += '\n-- products (' + products.size + ')\n';
for (const [code, d] of products) {
  sql += "insert into products (code, stocking_unit, thickness_mm, width_mm, length_mm, purchase_thickness_mm, purchase_width_mm, purchase_length_mm) values (" +
    q(code) + ", 'pack', " + qn(d.selT) + ", " + qn(d.selW) + ", " + qn(d.len) + ", " + qn(d.purT) + ", " + qn(d.purW) + ", " + qn(d.len) +
    ") on conflict (code) do update set thickness_mm=excluded.thickness_mm, width_mm=excluded.width_mm, length_mm=excluded.length_mm, " +
    "purchase_thickness_mm=excluded.purchase_thickness_mm, purchase_width_mm=excluded.purchase_width_mm, purchase_length_mm=excluded.purchase_length_mm;\n";
}

sql += '\n-- batches (' + batches.size + ')\n';
for (const [, b] of batches) {
  sql += "insert into product_batches (product_id, batch_no, ppp, currency, cost_per_m3, exchange_rate, freight_rate) select id, " +
    q(b.batch_no) + ", " + qn(b.ppp) + ", 'EUR', " + qn(b.cost) + ", " + EXCHANGE + ", " + FREIGHT +
    " from products where code = " + q(b.code) + " on conflict (product_id, batch_no) do update set ppp=excluded.ppp, cost_per_m3=excluded.cost_per_m3;\n";
}

sql += '\n-- stock levels (' + stock.length + ')\n';
stock.forEach(s => {
  sql += "insert into stock_levels (batch_id, location_id, packs, volume_m3, avg_cost_per_m3) select b.id, l.id, " +
    qn(s.packs) + ", " + qn(s.vol) + ", " + qn(s.landed) +
    " from product_batches b join products p on p.id=b.product_id, locations l where p.code=" + q(s.code) +
    " and b.batch_no=" + q(s.batch_no) + " and l.name=" + q(s.bin) +
    " on conflict (batch_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;\n";
});

sql += '\ncommit;\n';
fs.writeFileSync(OUT, sql);
console.log('Wrote ' + OUT + ': ' + products.size + ' products, ' + batches.size + ' batches, ' + stock.length + ' stock rows.');
