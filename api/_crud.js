// Generic, injection-safe CRUD over Neon for the master-data entities.
// Column/table names come ONLY from the whitelists below (never user input);
// all values are passed as bound parameters.
import { sql } from './_lib.js';

export const ENTITIES = {
  customers: {
    table: 'customers',
    columns: ['name', 'contact_name', 'email', 'phone', 'address', 'city', 'postcode', 'account_no', 'vat_rate',
      'credit_limit', 'credit_terms_days', 'credit_terms_eom', 'sales_rep_id',
      'company_number', 'vat_number', 'registered_name', 'registered_address',
      'bank_name', 'bank_account_name', 'bank_sort_code', 'bank_account_number', 'bank_iban', 'bank_bic', 'notes'],
    required: ['name'],
    search: ['name', 'contact_name', 'email', 'city', 'account_no'],
    numeric: ['vat_rate', 'credit_limit', 'credit_terms_days', 'sales_rep_id'],
    boolean: ['credit_terms_eom']
  },
  suppliers: {
    table: 'suppliers',
    columns: ['name', 'contact_name', 'email', 'phone', 'address', 'city', 'postcode', 'vat_rate',
      'company_number', 'vat_number', 'registered_name', 'registered_address',
      'bank_name', 'bank_account_name', 'bank_sort_code', 'bank_account_number', 'bank_iban', 'bank_bic', 'notes'],
    required: ['name'],
    search: ['name', 'contact_name', 'email', 'city'],
    numeric: ['vat_rate']
  },
  hauliers: {
    table: 'hauliers',
    columns: ['name', 'contact_name', 'phone', 'email', 'vehicle_types', 'city', 'county', 'postcode', 'notes'],
    required: ['name'],
    search: ['name', 'contact_name', 'email', 'city', 'county', 'postcode'],
    numeric: []
  },
  products: {
    table: 'products',
    columns: ['code', 'description', 'category', 'species', 'treatment', 'stocking_unit', 'ppp',
      'thickness_mm', 'width_mm', 'length_mm',
      'purchase_thickness_mm', 'purchase_width_mm', 'purchase_length_mm',
      'avg_cost_per_m3', 'sell_rate_per_m3', 'default_supplier_id', 'primary_location_id',
      'tax_rate', 'reorder_packs', 'notes'],
    required: ['code'],
    search: ['code', 'description', 'species', 'category'],
    // piece_volume / pack_volume are generated columns — never written.
    numeric: ['ppp', 'thickness_mm', 'width_mm', 'length_mm',
      'purchase_thickness_mm', 'purchase_width_mm', 'purchase_length_mm',
      'avg_cost_per_m3', 'sell_rate_per_m3', 'default_supplier_id', 'primary_location_id', 'reorder_packs']
  },

  locations: {
    table: 'locations',
    columns: ['name', 'code', 'address', 'city', 'postcode'],
    required: ['name'],
    search: ['name', 'code', 'city'],
    numeric: []
  }
};

export function getEntity(name) {
  return Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : null;
}

// Call the neon tagged template programmatically from string parts + values.
function tagged(parts, values) {
  const s = parts.slice();
  s.raw = parts.slice();
  return sql(s, ...values);
}

// Coerce/clean an incoming row to only whitelisted columns.
function clean(entity, body) {
  const out = {};
  for (const col of entity.columns) {
    if (body[col] === undefined) continue;
    let v = body[col];
    if (v === '' ) v = null;
    if (v !== null && entity.numeric.includes(col)) {
      const n = Number(v);
      v = Number.isFinite(n) ? n : null;
    }
    if (entity.boolean && entity.boolean.includes(col)) {
      v = (v === true || v === 'true' || v === 1 || v === '1' || v === 'on');
    }
    out[col] = v;
  }
  return out;
}

export function validateRow(entity, row, { partial = false } = {}) {
  const errors = [];
  if (!partial) {
    for (const col of entity.required) {
      if (row[col] === undefined || row[col] === null || row[col] === '') {
        errors.push(`${col.replace(/_/g, ' ')} is required.`);
      }
    }
  }
  return errors;
}

export async function list(entity, q) {
  if (q && entity.search.length) {
    const like = `%${String(q).toLowerCase()}%`;
    const parts = ['select * from "' + entity.table + '" where '];
    const values = [];
    entity.search.forEach((col, i) => {
      values.push(like);
      parts[parts.length - 1] += 'lower(coalesce("' + col + '"::text, \'\')) like ';
      parts.push(i < entity.search.length - 1 ? ' or ' : ' order by id desc limit 200');
    });
    return tagged(parts, values);
  }
  return tagged(['select * from "' + entity.table + '" order by id desc limit 200'], []);
}

export async function getOne(entity, id) {
  const rows = await tagged(['select * from "' + entity.table + '" where id = ', ''], [id]);
  return rows[0] || null;
}

export async function create(entity, body) {
  const row = clean(entity, body);
  const cols = Object.keys(row);
  if (!cols.length) throw new Error('No valid fields provided.');
  const parts = ['insert into "' + entity.table + '" (' + cols.map(c => '"' + c + '"').join(', ') + ') values ('];
  const values = [];
  cols.forEach((c, i) => {
    values.push(row[c]);
    parts.push(i < cols.length - 1 ? ', ' : ') returning *');
  });
  const rows = await tagged(parts, values);
  return rows[0];
}

export async function update(entity, id, body) {
  const row = clean(entity, body);
  const cols = Object.keys(row);
  if (!cols.length) return getOne(entity, id);
  const parts = ['update "' + entity.table + '" set '];
  const values = [];
  cols.forEach((c, i) => {
    values.push(row[c]);
    if (i === 0) parts[0] += '"' + c + '" = ';
    else parts.push(', "' + c + '" = ');
  });
  parts.push(' where id = ');
  values.push(id);
  parts.push(' returning *');
  const rows = await tagged(parts, values);
  return rows[0] || null;
}

export async function remove(entity, id) {
  await tagged(['delete from "' + entity.table + '" where id = ', ''], [id]);
  return true;
}
