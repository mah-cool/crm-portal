// =====================================================================
//  Single API router (ONE Serverless Function).
//  Vercel's Hobby plan rejects a deployment with >12 functions, so every
//  endpoint is dispatched from this one catch-all by its path. The client
//  URLs are unchanged:
//    POST /api/login | /api/logout | /api/signup    GET /api/me
//    GET|POST /api/data/:entity   GET|PATCH|DELETE /api/data/:entity/:id
//    GET /api/stock   POST /api/stock/adjust
//    GET|POST /api/users   PATCH|DELETE /api/users/:id
//    GET|POST /api/orders  GET|PATCH|DELETE /api/orders/:id
//    POST /api/orders/:id/picking
//    GET /api/picking   GET|PATCH|DELETE /api/picking/:id
// =====================================================================
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  sql, readJson, send, validate, requireUser, requireAdmin, getSession,
  createToken, setSessionCookie, clearSessionCookie
} from './_lib.js';
import { getEntity, list, getOne, create, update, remove, validateRow } from './_crud.js';
import { nextNumber, refreshOrderStatus } from './_docs.js';

const DUMMY_HASH = '$2a$12$kkSY198iQQRUAhmAVqq2o.85krHvyitW5vDUR/iPocizHT6/lP0TK';

export default async function handler(req, res) {
  // Resolve the path segments after /api from whatever Vercel provides:
  // the catch-all query param (array or string), falling back to the URL.
  let slug = [];
  const qs = req.query && (req.query.p || req.query.slug);  // p = path passed by the rewrite
  if (Array.isArray(qs)) slug = qs.slice();
  else if (typeof qs === 'string' && qs.length) slug = qs.split('/');
  if (!slug.length) {
    const path = (req.url || '').split('?')[0];
    slug = path.split('/').filter(Boolean);
  }
  if (slug[0] === 'api') slug = slug.slice(1);   // strip a leading "api" if present
  const [a, b, c] = slug;

  try {
    switch (a) {
      case 'login':   return await login(req, res);
      case 'logout':  return await logout(req, res);
      case 'signup':  return await signup(req, res);
      case 'me':      return await me(req, res);
      case 'data':    return await data(req, res, b, c);
      case 'stock':   return await stock(req, res, b);
      case 'users':   return await users(req, res, b);
      case 'invites': return await invites(req, res, b, c);
      case 'orders':  return await orders(req, res, b, c);
      case 'picking': return await picking(req, res, b, c);
      case 'delivery': return await delivery(req, res, b, c);
      case 'invoices': return await invoices(req, res, b);
      case 'payments': return await payments(req, res, b);
      case 'accounts': return await accounts(req, res, b);
      case 'reports': return await reports(req, res, b);
      case 'dashboard': return await dashboard(req, res);
      case 'customers': return await customersCrm(req, res, b);
      case 'stafflist': return await staffList(req, res);
      case 'options': return await options(req, res);
      case 'batches': return await batches(req, res, b);
      case 'contacts': return await contacts(req, res, b);
      case 'interactions': return await interactions(req, res, b);
      case 'stocklist': return await stocklist(req, res, b);
      case 'purchasing': return await purchasing(req, res, b, c);
      case 'loading': return await loading(req, res, b, c);
      case 'haulage': return await haulage(req, res, b, c);
      case 'addresses': return await addresses(req, res, b);
      default:        return send(res, 404, { error: 'Unknown endpoint.' });
    }
  } catch (err) {
    console.error('api error [' + slug.join('/') + ']:', err);
    return send(res, 500, { error: 'Server error: ' + (err && err.message ? err.message : 'unknown') });
  }
}

/* ----------------------------- auth ------------------------------- */
async function login(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const body = await readJson(req);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (validate({ email, password }).length) return send(res, 400, { error: 'Please enter your email and password.' });

  const rows = await sql`select id, email, name, password, role, active from users where lower(email) = ${email} limit 1`;
  const user = rows[0];
  if (user && user.active === false) return send(res, 403, { error: 'This account has been deactivated.' });
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) return send(res, 401, { error: 'Invalid email or password.' });

  setSessionCookie(res, await createToken(user));
  return send(res, 200, { user: { email: user.email, name: user.name } });
}

async function logout(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  clearSessionCookie(res);
  return send(res, 200, { ok: true });
}

async function signup(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const body = await readJson(req);
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  const admins = await sql`select 1 from users where role = 'admin' limit 1`;
  if (admins.length) return send(res, 403, { error: 'Sign-up is closed. Ask an admin to create your account.' });

  const errors = validate({ email, password, name }, { requireName: true });
  if (errors.length) return send(res, 400, { error: errors.join(' ') });
  const existing = await sql`select id from users where lower(email) = ${email} limit 1`;
  if (existing.length) return send(res, 409, { error: 'An account with that email already exists.' });

  const hash = await bcrypt.hash(password, 12);
  const rows = await sql`
    insert into users (email, password, name, role, active)
    values (${email}, ${hash}, ${name}, 'admin', true)
    returning id, email, name, role`;
  setSessionCookie(res, await createToken(rows[0]));
  return send(res, 201, { user: { email: rows[0].email, name: rows[0].name, role: rows[0].role } });
}

async function me(req, res) {
  const session = await getSession(req);
  if (!session) return send(res, 200, { user: null });
  // Read fresh role/active/permissions so changes apply without re-login.
  const rows = await sql`select id, email, name, role, active, permissions from users where id = ${Number(session.sub)}`;
  if (!rows.length || rows[0].active === false) return send(res, 200, { user: null });
  const u = rows[0];
  return send(res, 200, { user: { id: u.id, email: u.email, name: u.name, role: u.role || 'staff', permissions: u.permissions || null } });
}

/* --------------------------- generic data ------------------------- */
async function data(req, res, entityName, id) {
  const session = await requireUser(req, res);
  if (!session) return;
  const entity = getEntity(entityName);
  if (!entity) return send(res, 404, { error: 'Unknown resource.' });

  if (id === undefined) {
    if (req.method === 'GET') return send(res, 200, { rows: await list(entity, req.query.q || '') });
    if (req.method === 'POST') {
      const body = await readJson(req);
      const errors = validateRow(entity, body);
      if (errors.length) return send(res, 400, { error: errors.join(' ') });
      return send(res, 201, { row: await create(entity, body) });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method === 'GET') {
    const row = await getOne(entity, nid);
    return row ? send(res, 200, { row }) : send(res, 404, { error: 'Not found.' });
  }
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const row = await update(entity, nid, await readJson(req));
    return row ? send(res, 200, { row }) : send(res, 404, { error: 'Not found.' });
  }
  if (req.method === 'DELETE') { await remove(entity, nid); return send(res, 200, { ok: true }); }
  return send(res, 405, { error: 'Method not allowed' });
}

/* ------------------------------ stock ----------------------------- */
const STOCK_REASONS = ['purchase', 'sale', 'adjustment', 'correction', 'transfer'];

async function stock(req, res, sub) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (sub === 'adjust') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const body = await readJson(req);
    const batchId = Number(body.batch_id), locationId = Number(body.location_id), change = Number(body.change);
    const reason = STOCK_REASONS.includes(body.reason) ? body.reason : 'adjustment';
    const note = (body.note || '').trim() || null;
    if (!Number.isInteger(batchId) || batchId <= 0) return send(res, 400, { error: 'Invalid batch.' });
    if (!Number.isInteger(locationId) || locationId <= 0) return send(res, 400, { error: 'Choose a location.' });
    if (!Number.isFinite(change) || change === 0) return send(res, 400, { error: 'Enter a non-zero number of packs.' });

    await sql`insert into stock_movements (batch_id, location_id, change, reason, note, created_by)
              values (${batchId}, ${locationId}, ${change}, ${reason}, ${note}, ${Number(session.sub)})`;
    if (change > 0) await addStockWeighted(batchId, locationId, change, await batchLandedCost(batchId));
    else await removeStockPacks(batchId, locationId, -change);
    const rows = await sql`select packs, volume_m3 from stock_levels where batch_id = ${batchId} and location_id = ${locationId}`;
    return rows.length ? send(res, 200, { packs: rows[0].packs, volume_m3: rows[0].volume_m3 })
                       : send(res, 200, { packs: 0, volume_m3: 0 });
  }

  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const q = (req.query.q || '').toLowerCase().trim();
  const like = '%' + q + '%';
  const locId = req.query.location_id ? Number(req.query.location_id) : null;
  const rows = await sql`
    select sl.id, sl.batch_id, sl.location_id, sl.packs, sl.volume_m3, sl.avg_cost_per_m3,
           coalesce(sl.allocated_packs,0) as allocated_packs,
           (coalesce(sl.packs,0) - coalesce(sl.allocated_packs,0)) as available_packs,
           v.product_id, v.code, v.batch_no, v.ppp, v.description, v.sell_rate_per_m3, v.landed_cost_per_m3,
           p.reorder_packs, l.name as location_name,
           round(coalesce(sl.volume_m3,0) * coalesce(sl.avg_cost_per_m3,0))::numeric as stock_value
    from stock_levels sl
    join batch_view v on v.id = sl.batch_id
    join products p on p.id = v.product_id
    join locations l on l.id = sl.location_id
    where (${q} = '' or lower(v.code) like ${like} or lower(coalesce(v.batch_no,'')) like ${like}
           or lower(coalesce(v.description,'')) like ${like})
      and (${locId}::bigint is null or sl.location_id = ${locId})
    order by v.code, v.batch_no, l.name limit 2000`;
  return send(res, 200, { rows });
}

/* ------------------------------ users ----------------------------- */
async function users(req, res, id) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const rows = await sql`select id, name, email, role, active, permissions, created_at from users order by id`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const role = body.role === 'admin' ? 'admin' : 'staff';
      const errors = validate({ email, password, name }, { requireName: true });
      if (errors.length) return send(res, 400, { error: errors.join(' ') });
      const existing = await sql`select id from users where lower(email) = ${email} limit 1`;
      if (existing.length) return send(res, 409, { error: 'An account with that email already exists.' });
      const hash = await bcrypt.hash(password, 12);
      const rows = await sql`insert into users (email, password, name, role, active)
        values (${email}, ${hash}, ${name}, ${role}, true)
        returning id, name, email, role, active, created_at`;
      return send(res, 201, { row: rows[0] });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  const isSelf = String(nid) === String(admin.sub);

  if (req.method === 'PATCH') {
    const body = await readJson(req);
    const updates = {};
    if (body.role === 'admin' || body.role === 'staff') updates.role = body.role;
    if (typeof body.active === 'boolean') updates.active = body.active;
    let newPassword = null;
    if (typeof body.password === 'string' && body.password.length) {
      if (body.password.length < 8) return send(res, 400, { error: 'Password must be at least 8 characters.' });
      newPassword = body.password;
    }
    var setPerms = ('permissions' in body);
    if (isSelf && (updates.active === false || updates.role === 'staff'))
      return send(res, 400, { error: 'You cannot demote or deactivate your own account.' });
    if (!('role' in updates) && !('active' in updates) && !newPassword && !setPerms)
      return send(res, 400, { error: 'Nothing to update.' });
    if ('role' in updates) await sql`update users set role = ${updates.role} where id = ${nid}`;
    if ('active' in updates) await sql`update users set active = ${updates.active} where id = ${nid}`;
    if (setPerms) {
      const perms = Array.isArray(body.permissions) ? JSON.stringify(body.permissions) : null;
      await sql`update users set permissions = ${perms}::jsonb where id = ${nid}`;
    }
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 12);
      await sql`update users set password = ${hash} where id = ${nid}`;
    }
    const rows = await sql`select id, name, email, role, active, permissions, created_at from users where id = ${nid}`;
    return rows.length ? send(res, 200, { row: rows[0] }) : send(res, 404, { error: 'Not found.' });
  }
  if (req.method === 'DELETE') {
    if (isSelf) return send(res, 400, { error: 'You cannot delete your own account.' });
    await sql`delete from users where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* ------------------------------ invites --------------------------- */
async function invites(req, res, sub, sub2) {
  // ---- Public: validate a token (to render the accept form) ----
  if (sub === 'validate') {
    const token = req.query.token || '';
    const rows = await sql`select email, role, expires_at, used_at from invites where token = ${token}`;
    if (!rows.length) return send(res, 404, { error: 'This invite link is not valid.' });
    const inv = rows[0];
    if (inv.used_at) return send(res, 400, { error: 'This invite has already been used.' });
    if (new Date(inv.expires_at) < new Date()) return send(res, 400, { error: 'This invite has expired.' });
    return send(res, 200, { ok: true, email: inv.email, role: inv.role });
  }
  // ---- Public: accept an invite -> create the account + sign in ----
  if (sub === 'accept') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = await readJson(req);
    const rows = await sql`select * from invites where token = ${b.token || ''}`;
    if (!rows.length) return send(res, 404, { error: 'This invite link is not valid.' });
    const inv = rows[0];
    if (inv.used_at) return send(res, 400, { error: 'This invite has already been used.' });
    if (new Date(inv.expires_at) < new Date()) return send(res, 400, { error: 'This invite has expired.' });
    const name = (b.name || '').trim();
    const email = (b.email || inv.email || '').trim().toLowerCase();
    const password = b.password || '';
    const errors = validate({ email, password, name }, { requireName: true });
    if (errors.length) return send(res, 400, { error: errors.join(' ') });
    const existing = await sql`select id from users where lower(email) = ${email} limit 1`;
    if (existing.length) return send(res, 409, { error: 'An account with that email already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const role = inv.role === 'admin' ? 'admin' : 'staff';
    const perms = inv.permissions != null ? JSON.stringify(inv.permissions) : null;
    const u = await sql`insert into users (email, password, name, role, active, permissions)
      values (${email}, ${hash}, ${name}, ${role}, true, ${perms}::jsonb)
      returning id, email, name, role`;
    await sql`update invites set used_at = now(), used_by = ${u[0].id} where id = ${inv.id}`;
    setSessionCookie(res, await createToken(u[0]));
    return send(res, 201, { user: { email: u[0].email, name: u[0].name } });
  }

  // ---- Admin only below ----
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (sub === undefined) {
    if (req.method === 'GET') {
      const rows = await sql`select i.id, i.token, i.email, i.role, i.expires_at, i.used_at,
                                    u.name as used_by_name
        from invites i left join users u on u.id = i.used_by order by i.id desc limit 200`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const role = b.role === 'admin' ? 'admin' : 'staff';
      const days = Number(b.days) > 0 ? Number(b.days) : 7;
      const token = randomBytes(24).toString('hex');
      const perms = Array.isArray(b.permissions) ? JSON.stringify(b.permissions) : null;
      const rows = await sql`
        insert into invites (token, email, role, permissions, created_by, expires_at)
        values (${token}, ${b.email || null}, ${role}, ${perms}::jsonb, ${Number(admin.sub)}, now() + make_interval(days => ${days}))
        returning id, token, expires_at`;
      return send(res, 201, { id: rows[0].id, token: token, expires_at: rows[0].expires_at });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(sub);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method === 'DELETE') {
    await sql`delete from invites where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* ------------------------------ orders ---------------------------- */
// Haulier no longer lives on the sales order — it belongs to the haulage
// order. vat_rate is snapshotted from the customer at creation; it stays
// editable per order here for corrections.
const ORDER_HEADER = ['customer_ref', 'order_type', 'status', 'order_date', 'due_date',
  'location_id', 'delivery_name', 'delivery_address', 'delivery_city', 'delivery_postcode', 'vat_rate', 'notes'];
const WRITEOFF_REASONS = ['lost_order', 'office_amendment', 'customer_change', 'other'];

async function orders(req, res, id, action) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const q = (req.query.q || '').toLowerCase().trim();
      const like = '%' + q + '%';
      const rows = await sql`
        select o.id, o.number, o.order_type, o.status, o.order_date, o.due_date, o.customer_ref,
               c.name as customer_name, o.customer_id,
               o.delivery_name, o.delivery_address, o.delivery_city, o.delivery_postcode,
               coalesce((select sum(l.quantity * l.unit_price) from sales_order_lines l where l.order_id = o.id),0) as net,
               exists(select 1 from sales_order_lines l where l.order_id = o.id and l.quantity > l.qty_picked) as has_outstanding
        from sales_orders o left join customers c on c.id = o.customer_id
        where (${q} = '' or lower(coalesce(o.number,'')) like ${like}
               or lower(coalesce(c.name,'')) like ${like} or lower(coalesce(o.customer_ref,'')) like ${like})
        order by o.id desc limit 500`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const bdy = await readJson(req);
      const customerId = bdy.customer_id ? Number(bdy.customer_id) : null;
      if (!customerId) return send(res, 400, { error: 'Choose a customer.' });
      const lines = Array.isArray(bdy.lines) ? bdy.lines.filter(l => l && l.batch_id && Number(l.quantity) > 0) : [];
      if (!lines.length) return send(res, 400, { error: 'Add at least one line with a batch and quantity.' });

      // VAT rate is configured on the customer; snapshot it onto the order.
      const cust = await sql`select vat_rate from customers where id = ${customerId}`;
      const vatRate = cust.length && cust[0].vat_rate != null ? Number(cust[0].vat_rate)
                    : (bdy.vat_rate != null && bdy.vat_rate !== '' ? Number(bdy.vat_rate) : 20);
      const number = await nextNumber('sales_order');
      const orderType = bdy.order_type === 'collect' ? 'collect' : 'delivery';
      const ord = await sql`
        insert into sales_orders
          (number, customer_id, order_type, status, customer_ref, order_date, due_date,
           location_id, delivery_name, delivery_address, delivery_city, delivery_postcode, vat_rate, notes, created_by)
        values (${number}, ${customerId}, ${orderType}, 'open', ${bdy.customer_ref || null},
           coalesce(${bdy.order_date || null}::date, current_date), ${bdy.due_date || null},
           ${bdy.location_id ? Number(bdy.location_id) : null}, ${bdy.delivery_name || null}, ${bdy.delivery_address || null},
           ${bdy.delivery_city || null}, ${bdy.delivery_postcode || null}, ${vatRate},
           ${bdy.notes || null}, ${Number(session.sub)})
        returning id, number`;
      const orderId = ord[0].id;
      let n = 0;
      for (const l of lines) {
        n++;
        // Sell by £/m³: unit_price (£/pack) = rate × the batch's pack volume.
        const bid = Number(l.batch_id);
        const bv = await sql`select code, description, pack_volume from batch_view where id = ${bid}`;
        const packVol = bv.length ? Number(bv[0].pack_volume) || 0 : 0;
        const rate = l.rate_per_m3 != null && l.rate_per_m3 !== '' ? Number(l.rate_per_m3) : null;
        const unitPrice = rate != null ? rate * packVol : (Number(l.unit_price) || 0);
        await sql`insert into sales_order_lines
            (order_id, line_no, batch_id, code, description, sell_unit, quantity, unit_price, sell_rate_per_m3)
          values (${orderId}, ${n}, ${bid}, ${bv.length ? bv[0].code : (l.code || null)},
                  ${bv.length ? bv[0].description : (l.description || null)},
                  'm3', ${Number(l.quantity)}, ${unitPrice}, ${rate})`;
      }
      return send(res, 201, { id: orderId, number: ord[0].number });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) return send(res, 400, { error: 'Invalid order id.' });

  // POST /api/orders/:id/lines — add ONE new line (allowed even after picking).
  if (action === 'lines') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const ord = await sql`select status from sales_orders where id = ${orderId}`;
    if (!ord.length) return send(res, 404, { error: 'Order not found.' });
    if (ord[0].status === 'cancelled' || ord[0].status === 'invoiced') return send(res, 400, { error: 'Order is closed.' });
    const bdy = await readJson(req);
    const bid = bdy.batch_id ? Number(bdy.batch_id) : null;
    const qty = Number(bdy.quantity) || 0;
    if (!bid || qty <= 0) return send(res, 400, { error: 'Choose a batch and quantity.' });
    const bv = await sql`select code, description, pack_volume from batch_view where id = ${bid}`;
    const packVol = bv.length ? Number(bv[0].pack_volume) || 0 : 0;
    const rate = bdy.rate_per_m3 != null && bdy.rate_per_m3 !== '' ? Number(bdy.rate_per_m3) : null;
    const unitPrice = rate != null ? rate * packVol : (Number(bdy.unit_price) || 0);
    const ln = await sql`select coalesce(max(line_no),0) + 1 as n from sales_order_lines where order_id = ${orderId}`;
    await sql`insert into sales_order_lines (order_id, line_no, batch_id, code, description, sell_unit, quantity, unit_price, sell_rate_per_m3)
      values (${orderId}, ${ln[0].n}, ${bid}, ${bv.length ? bv[0].code : null}, ${bv.length ? bv[0].description : null}, 'm3', ${qty}, ${unitPrice}, ${rate})`;
    await refreshOrderStatus(orderId);
    return send(res, 201, { ok: true });
  }

  // POST /api/orders/:id/writeoff — write off un-picked outstanding with a reason.
  if (action === 'writeoff') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const ord = await sql`select status from sales_orders where id = ${orderId}`;
    if (!ord.length) return send(res, 404, { error: 'Order not found.' });
    if (ord[0].status === 'cancelled' || ord[0].status === 'invoiced') return send(res, 400, { error: 'Order is closed.' });
    const bdy = await readJson(req);
    const lineId = Number(bdy.order_line_id);
    const wq = Number(bdy.quantity) || 0;
    const reason = WRITEOFF_REASONS.includes(bdy.reason) ? bdy.reason : 'other';
    const line = await sql`select * from sales_order_lines where id = ${lineId} and order_id = ${orderId}`;
    if (!line.length) return send(res, 404, { error: 'Order line not found.' });
    const l = line[0];
    const outstanding = Number(l.quantity) - Number(l.qty_picked);   // only un-picked can be written off
    if (wq <= 0) return send(res, 400, { error: 'Enter a quantity to write off.' });
    if (wq > outstanding + 0.0001) return send(res, 400, { error: 'Cannot write off more than the un-picked outstanding (' + outstanding + '). Cancel the pick first to release picked stock.' });
    await sql`update sales_order_lines set quantity = quantity - ${wq} where id = ${lineId}`;
    await sql`insert into order_write_offs (order_id, order_line_id, batch_id, code, quantity, reason, note, created_by)
      values (${orderId}, ${lineId}, ${l.batch_id}, ${l.code || null}, ${wq}, ${reason}, ${bdy.note || null}, ${Number(session.sub)})`;
    // If nothing left ordered anywhere and nothing delivered, close the order.
    const rem = await sql`select coalesce(sum(quantity),0) as q, coalesce(sum(qty_delivered),0) as d from sales_order_lines where order_id = ${orderId}`;
    if (Number(rem[0].q) <= 0 && Number(rem[0].d) <= 0) await sql`update sales_orders set status = 'cancelled' where id = ${orderId}`;
    else await refreshOrderStatus(orderId);
    return send(res, 200, { ok: true });
  }

  if (action === 'picking') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const ord = await sql`select id, location_id, status from sales_orders where id = ${orderId}`;
    if (!ord.length) return send(res, 404, { error: 'Order not found.' });
    if (ord[0].status === 'cancelled') return send(res, 400, { error: 'Order is cancelled.' });
    const bdy = await readJson(req);
    const locationId = bdy.location_id ? Number(bdy.location_id) : ord[0].location_id;
    if (!locationId) return send(res, 400, { error: 'Choose a location to pick from.' });

    const lines = await sql`select id, batch_id, code, description, quantity, qty_picked
                            from sales_order_lines where order_id = ${orderId} order by line_no, id`;
    const toPick = lines.map(l => ({ ...l, outstanding: Number(l.quantity) - Number(l.qty_picked) }))
                        .filter(l => l.outstanding > 0);
    if (!toPick.length) return send(res, 400, { error: 'Nothing left to pick on this order.' });

    const number = await nextNumber('picking_note');
    const pn = await sql`insert into picking_notes (number, order_id, location_id, status, created_by)
      values (${number}, ${orderId}, ${locationId}, 'open', ${Number(session.sub)}) returning id, number`;
    for (const l of toPick) {
      await sql`insert into picking_note_lines (picking_note_id, order_line_id, batch_id, code, description, qty_to_pick)
                values (${pn[0].id}, ${l.id}, ${l.batch_id}, ${l.code || null}, ${l.description || null}, ${l.outstanding})`;
    }
    return send(res, 201, { id: pn[0].id, number: pn[0].number });
  }

  if (req.method === 'GET') {
    const head = await sql`
      select o.*, c.name as customer_name, l.name as location_name
      from sales_orders o
      left join customers c on c.id = o.customer_id
      left join locations l on l.id = o.location_id
      where o.id = ${orderId}`;
    if (!head.length) return send(res, 404, { error: 'Order not found.' });
    const lines = await sql`
      select sol.*, v.batch_no, v.ppp, v.pack_volume,
             v.landed_cost_per_m3 as cost_per_m3,
             v.thickness_mm, v.width_mm, v.length_mm
      from sales_order_lines sol
      left join batch_view v on v.id = sol.batch_id
      where sol.order_id = ${orderId} order by sol.line_no, sol.id`;
    const pickings = await sql`select id, number, status, created_at from picking_notes where order_id = ${orderId} order by id`;
    const deliveries = await sql`select id, number, status, created_at from delivery_notes where order_id = ${orderId} order by id`;
    const invoices = await sql`select id, number, status, gross from invoices where order_id = ${orderId} order by id`;
    const writeoffs = await sql`select w.code, w.quantity, w.reason, w.note, w.created_at, u.name as author
                                from order_write_offs w left join users u on u.id = w.created_by
                                where w.order_id = ${orderId} order by w.id`;
    return send(res, 200, { order: head[0], lines, pickings, deliveries, invoices, writeoffs });
  }
  if (req.method === 'PATCH') {
    const bdy = await readJson(req);
    // Customer can be changed (re-snapshot VAT) while editing an open order.
    if (bdy.customer_id) {
      const cid = Number(bdy.customer_id);
      await sql`update sales_orders set customer_id = ${cid} where id = ${orderId}`;
      if (!('vat_rate' in bdy)) {
        const c = await sql`select vat_rate from customers where id = ${cid}`;
        if (c.length && c[0].vat_rate != null) await sql`update sales_orders set vat_rate = ${Number(c[0].vat_rate)} where id = ${orderId}`;
      }
    }
    for (const col of ORDER_HEADER) {
      if (!(col in bdy)) continue;
      let v = bdy[col];
      if (v === '') v = null;
      if (['location_id', 'vat_rate'].includes(col) && v != null) v = Number(v);
      await orderHeaderUpdate(orderId, col, v);
    }
    // Replace lines (spec change) — only before any picking has started.
    if (Array.isArray(bdy.lines)) {
      const picked = await sql`select coalesce(sum(qty_picked),0) as p from sales_order_lines where order_id = ${orderId}`;
      if (Number(picked[0].p) > 0) return send(res, 400, { error: 'Cannot edit lines once picking has started.' });
      const lines = bdy.lines.filter(l => l && l.batch_id && Number(l.quantity) > 0);
      if (!lines.length) return send(res, 400, { error: 'Add at least one line with a batch and quantity.' });
      await sql`delete from sales_order_lines where order_id = ${orderId}`;
      let n = 0;
      for (const l of lines) {
        n++;
        const bid = Number(l.batch_id);
        const bv = await sql`select code, description, pack_volume from batch_view where id = ${bid}`;
        const packVol = bv.length ? Number(bv[0].pack_volume) || 0 : 0;
        const rate = l.rate_per_m3 != null && l.rate_per_m3 !== '' ? Number(l.rate_per_m3) : null;
        const unitPrice = rate != null ? rate * packVol : (Number(l.unit_price) || 0);
        await sql`insert into sales_order_lines
            (order_id, line_no, batch_id, code, description, sell_unit, quantity, unit_price, sell_rate_per_m3)
          values (${orderId}, ${n}, ${bid}, ${bv.length ? bv[0].code : (l.code || null)},
                  ${bv.length ? bv[0].description : (l.description || null)}, 'm3', ${Number(l.quantity)}, ${unitPrice}, ${rate})`;
      }
    }
    const head = await sql`select * from sales_orders where id = ${orderId}`;
    return send(res, 200, { order: head[0] });
  }
  if (req.method === 'DELETE') { await sql`delete from sales_orders where id = ${orderId}`; return send(res, 200, { ok: true }); }
  return send(res, 405, { error: 'Method not allowed' });
}

async function orderHeaderUpdate(id, col, v) {
  switch (col) {
    case 'customer_ref': return sql`update sales_orders set customer_ref = ${v} where id = ${id}`;
    case 'order_type': return sql`update sales_orders set order_type = ${v} where id = ${id}`;
    case 'status': return sql`update sales_orders set status = ${v} where id = ${id}`;
    case 'order_date': return sql`update sales_orders set order_date = ${v} where id = ${id}`;
    case 'due_date': return sql`update sales_orders set due_date = ${v} where id = ${id}`;
    case 'location_id': return sql`update sales_orders set location_id = ${v} where id = ${id}`;
    case 'delivery_name': return sql`update sales_orders set delivery_name = ${v} where id = ${id}`;
    case 'delivery_address': return sql`update sales_orders set delivery_address = ${v} where id = ${id}`;
    case 'delivery_city': return sql`update sales_orders set delivery_city = ${v} where id = ${id}`;
    case 'delivery_postcode': return sql`update sales_orders set delivery_postcode = ${v} where id = ${id}`;
    case 'vat_rate': return sql`update sales_orders set vat_rate = ${v} where id = ${id}`;
    case 'notes': return sql`update sales_orders set notes = ${v} where id = ${id}`;
  }
}

// A pick/delivery can span several orders (combined picks); refresh them all.
async function refreshOrdersFromPick(pickId) {
  const rows = await sql`select distinct sol.order_id as oid from picking_note_lines pnl
    join sales_order_lines sol on sol.id = pnl.order_line_id
    where pnl.picking_note_id = ${pickId} and sol.order_id is not null`;
  for (const r of rows) await refreshOrderStatus(r.oid);
}
async function refreshOrdersFromDelivery(delId) {
  const rows = await sql`select distinct sol.order_id as oid from delivery_note_lines dl
    join sales_order_lines sol on sol.id = dl.order_line_id
    where dl.delivery_note_id = ${delId} and sol.order_id is not null`;
  for (const r of rows) await refreshOrderStatus(r.oid);
}

/* ----------------------------- picking ---------------------------- */
async function picking(req, res, id, action) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    // POST /api/picking — create ONE pick note spanning several orders that
    // share a customer + delivery address, picked from one stock bin.
    if (req.method === 'POST') {
      const bdy = await readJson(req);
      const orderIds = Array.isArray(bdy.order_ids) ? bdy.order_ids.map(Number).filter(n => Number.isInteger(n) && n > 0) : [];
      if (!orderIds.length) return send(res, 400, { error: 'Select at least one order.' });
      const locationId = bdy.location_id ? Number(bdy.location_id) : null;
      if (!locationId) return send(res, 400, { error: 'Choose a location to pick from.' });
      const orders = await sql`select * from sales_orders where id = any(${orderIds}::bigint[])`;
      if (orders.length !== orderIds.length) return send(res, 404, { error: 'One or more orders not found.' });
      const first = orders[0];
      const sig = (o) => [o.delivery_name, o.delivery_address, o.delivery_city, o.delivery_postcode].map(x => (x || '').trim()).join('|');
      for (const o of orders) {
        if (o.status === 'cancelled') return send(res, 400, { error: 'One of the orders is cancelled.' });
        if (String(o.customer_id) !== String(first.customer_id)) return send(res, 400, { error: 'All orders must be for the same customer.' });
        if (sig(o) !== sig(first)) return send(res, 400, { error: 'All orders must share the same delivery address.' });
      }
      const oLines = await sql`select id, batch_id, code, description, quantity, qty_picked
        from sales_order_lines where order_id = any(${orderIds}::bigint[]) order by order_id, line_no, id`;
      const toPick = oLines.map(l => ({ ...l, outstanding: Number(l.quantity) - Number(l.qty_picked) })).filter(l => l.outstanding > 0);
      if (!toPick.length) return send(res, 400, { error: 'Nothing left to pick on the selected orders.' });
      const number = await nextNumber('picking_note');
      const pn = await sql`insert into picking_notes (number, order_id, location_id, status, created_by)
        values (${number}, ${first.id}, ${locationId}, 'open', ${Number(session.sub)}) returning id, number`;
      for (const l of toPick) {
        await sql`insert into picking_note_lines (picking_note_id, order_line_id, batch_id, code, description, qty_to_pick)
          values (${pn[0].id}, ${l.id}, ${l.batch_id}, ${l.code || null}, ${l.description || null}, ${l.outstanding})`;
      }
      return send(res, 201, { id: pn[0].id, number: pn[0].number });
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const q = (req.query.q || '').toLowerCase().trim();
    const like = '%' + q + '%';
    const rows = await sql`
      select pn.id, pn.number, pn.status, pn.created_at,
             o.number as order_number, o.due_date as order_due, c.name as customer_name, l.name as location_name,
             (select count(*) from picking_note_lines pl where pl.picking_note_id = pn.id) as line_count,
             (select count(*) from delivery_notes dn where dn.picking_note_id = pn.id and dn.status <> 'cancelled') as delivery_count,
             (select ho.id from haulage_order_drops d join haulage_orders ho on ho.id = d.haulage_order_id
              where d.picking_note_id = pn.id and ho.status <> 'cancelled' order by d.id desc limit 1) as haulage_id,
             (select ho.number from haulage_order_drops d join haulage_orders ho on ho.id = d.haulage_order_id
              where d.picking_note_id = pn.id and ho.status <> 'cancelled' order by d.id desc limit 1) as haulage_number,
             (select ho.collection_date from haulage_order_drops d join haulage_orders ho on ho.id = d.haulage_order_id
              where d.picking_note_id = pn.id and ho.status <> 'cancelled' order by d.id desc limit 1) as haulage_collection_date,
             (select ho.delivery_date from haulage_order_drops d join haulage_orders ho on ho.id = d.haulage_order_id
              where d.picking_note_id = pn.id and ho.status <> 'cancelled' order by d.id desc limit 1) as haulage_delivery_date
      from picking_notes pn
      left join sales_orders o on o.id = pn.order_id
      left join customers c on c.id = o.customer_id
      left join locations l on l.id = pn.location_id
      where (${q} = '' or lower(coalesce(pn.number,'')) like ${like}
             or lower(coalesce(o.number,'')) like ${like} or lower(coalesce(c.name,'')) like ${like})
      order by
        (case when pn.status = 'cancelled' then 2
              when (select count(*) from delivery_notes dn where dn.picking_note_id = pn.id and dn.status <> 'cancelled') > 0 then 1
              else 0 end) asc,
        haulage_delivery_date asc nulls last, haulage_number asc nulls last, pn.number asc
      limit 500`;
    return send(res, 200, { rows });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  // POST /api/picking/:id/delivery — raise a delivery note from a confirmed pick.
  if (action === 'delivery') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const pn = await sql`select * from picking_notes where id = ${nid}`;
    if (!pn.length) return send(res, 404, { error: 'Picking note not found.' });
    if (pn[0].status !== 'confirmed') return send(res, 400, { error: 'Confirm the picking note before raising a delivery note.' });
    const existing = await sql`select id from delivery_notes where picking_note_id = ${nid} and status <> 'cancelled'`;
    if (existing.length) return send(res, 400, { error: 'A delivery note already exists for this picking note.' });

    const ord = await sql`select * from sales_orders where id = ${pn[0].order_id}`;
    const o = ord[0] || {};
    const lines = await sql`select * from picking_note_lines where picking_note_id = ${nid} and qty_picked > 0 order by id`;
    if (!lines.length) return send(res, 400, { error: 'Nothing picked to deliver.' });

    const number = await nextNumber('delivery_note');
    const dn = await sql`
      insert into delivery_notes
        (number, order_id, picking_note_id, location_id, status,
         delivery_name, delivery_address, delivery_city, delivery_postcode, created_by)
      values (${number}, ${pn[0].order_id}, ${nid}, ${pn[0].location_id}, 'open',
         ${o.delivery_name || null}, ${o.delivery_address || null}, ${o.delivery_city || null},
         ${o.delivery_postcode || null}, ${Number(session.sub)})
      returning id, number`;
    for (const l of lines) {
      // Loaded qty defaults to the picked qty; qty_picked snapshots the reservation.
      await sql`insert into delivery_note_lines
          (delivery_note_id, order_line_id, picking_note_line_id, batch_id, code, description, qty, qty_picked)
        values (${dn[0].id}, ${l.order_line_id}, ${l.id}, ${l.batch_id}, ${l.code || null},
                ${l.description || null}, ${l.qty_picked}, ${l.qty_picked})`;
    }
    return send(res, 201, { id: dn[0].id, number: dn[0].number });
  }

  if (req.method === 'GET') {
    const head = await sql`
      select pn.*, o.number as order_number, o.customer_id, c.name as customer_name,
             o.delivery_name, o.delivery_address, o.delivery_city, o.delivery_postcode, l.name as location_name,
             (select string_agg(distinct o2.number, ', ') from picking_note_lines pl
              join sales_order_lines sl on sl.id = pl.order_line_id
              join sales_orders o2 on o2.id = sl.order_id where pl.picking_note_id = pn.id) as order_numbers,
             (select count(*) from delivery_notes dn where dn.picking_note_id = pn.id and dn.status <> 'cancelled') as delivery_count,
             (select ho.id from haulage_order_drops d join haulage_orders ho on ho.id = d.haulage_order_id
              where d.picking_note_id = pn.id and ho.status <> 'cancelled' order by d.id desc limit 1) as haulage_id,
             (select ho.number from haulage_order_drops d join haulage_orders ho on ho.id = d.haulage_order_id
              where d.picking_note_id = pn.id and ho.status <> 'cancelled' order by d.id desc limit 1) as haulage_number,
             (select ho.delivery_date from haulage_order_drops d join haulage_orders ho on ho.id = d.haulage_order_id
              where d.picking_note_id = pn.id and ho.status <> 'cancelled' order by d.id desc limit 1) as haulage_delivery_date
      from picking_notes pn
      left join sales_orders o on o.id = pn.order_id
      left join customers c on c.id = o.customer_id
      left join locations l on l.id = pn.location_id
      where pn.id = ${nid}`;
    if (!head.length) return send(res, 404, { error: 'Picking note not found.' });
    const lines = await sql`
      select pnl.*, v.batch_no, v.pack_volume from picking_note_lines pnl
      left join batch_view v on v.id = pnl.batch_id
      where pnl.picking_note_id = ${nid} order by pnl.id`;
    return send(res, 200, { picking: head[0], lines });
  }

  if (req.method === 'PATCH') {
    const bdy = await readJson(req);
    const pn = await sql`select * from picking_notes where id = ${nid}`;
    if (!pn.length) return send(res, 404, { error: 'Picking note not found.' });
    const note = pn[0];

    if (bdy.action === 'cancel') {
      if (note.status === 'cancelled') return send(res, 400, { error: 'Already cancelled.' });
      const dn = await sql`select count(*) as c from delivery_notes where picking_note_id = ${nid} and status <> 'cancelled'`;
      if (Number(dn[0].c) > 0) return send(res, 400, { error: 'A delivery note exists for this pick — delete/void it first.' });
      // A confirmed pick holds a reservation: reverse it so the order is editable again.
      if (note.status === 'confirmed') {
        const lines = await sql`select * from picking_note_lines where picking_note_id = ${nid}`;
        for (const line of lines) {
          const picked = Number(line.qty_picked || 0);
          if (picked <= 0) continue;
          if (line.order_line_id) await sql`update sales_order_lines set qty_picked = qty_picked - ${picked} where id = ${line.order_line_id}`;
          if (line.batch_id) await sql`update stock_levels set allocated_packs = coalesce(allocated_packs,0) - ${picked}, updated_at = now()
                                       where batch_id = ${line.batch_id} and location_id = ${note.location_id}`;
        }
      }
      await sql`update picking_notes set status = 'cancelled' where id = ${nid}`;
      await refreshOrdersFromPick(nid);
      return send(res, 200, { ok: true });
    }
    if (bdy.action === 'confirm') {
      if (note.status === 'confirmed') return send(res, 400, { error: 'Already confirmed.' });
      if (note.status === 'cancelled') return send(res, 400, { error: 'Picking note is cancelled.' });
      const locationId = note.location_id;
      if (!locationId) return send(res, 400, { error: 'No pick location set.' });

      const lines = await sql`select * from picking_note_lines where picking_note_id = ${nid}`;
      const overrides = {};
      if (Array.isArray(bdy.lines)) bdy.lines.forEach(l => { overrides[String(l.id)] = Number(l.qty_picked); });

      for (const line of lines) {
        let picked = overrides[String(line.id)];
        if (picked == null || !Number.isFinite(picked)) picked = Number(line.qty_to_pick);
        if (picked < 0) picked = 0;
        if (picked === 0) continue;

        await sql`update picking_note_lines set qty_picked = ${picked} where id = ${line.id}`;
        if (line.order_line_id) await sql`update sales_order_lines set qty_picked = qty_picked + ${picked} where id = ${line.order_line_id}`;

        // Reservation only: stock leaves at delivery. Raise allocated_packs so
        // available (= packs - allocated) drops and sales can't over-sell.
        await sql`
          insert into stock_levels (batch_id, location_id, packs, volume_m3, allocated_packs, avg_cost_per_m3)
          select ${line.batch_id}, ${locationId}, 0, 0, ${picked}, v.landed_cost_per_m3
          from batch_view v where v.id = ${line.batch_id}
          on conflict (batch_id, location_id) do update
            set allocated_packs = coalesce(stock_levels.allocated_packs,0) + ${picked},
                updated_at = now()`;
      }
      await sql`update picking_notes set status = 'confirmed', confirmed_at = now() where id = ${nid}`;
      await refreshOrdersFromPick(nid);
      return send(res, 200, { ok: true });
    }
    // No action: header field update (printable instructions).
    if ('instructions' in bdy) {
      await sql`update picking_notes set instructions = ${bdy.instructions || null} where id = ${nid}`;
      const rows = await sql`select * from picking_notes where id = ${nid}`;
      return send(res, 200, { picking: rows[0] });
    }
    // Edit lines (spec change) on an open pick: change qty_to_pick / remove lines.
    if (Array.isArray(bdy.lines)) {
      if (note.status !== 'open') return send(res, 400, { error: 'Only open picking notes can be edited.' });
      for (const l of bdy.lines) {
        if (!l || !l.id) continue;
        if (l.remove) await sql`delete from picking_note_lines where id = ${Number(l.id)} and picking_note_id = ${nid}`;
        else if (l.qty_to_pick != null) await sql`update picking_note_lines set qty_to_pick = ${Number(l.qty_to_pick) || 0} where id = ${Number(l.id)} and picking_note_id = ${nid}`;
      }
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: 'Unknown action.' });
  }

  if (req.method === 'DELETE') {
    const pn = await sql`select status from picking_notes where id = ${nid}`;
    if (pn.length && pn[0].status === 'confirmed') return send(res, 400, { error: 'Cannot delete a confirmed picking note.' });
    await sql`delete from picking_notes where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* ----------------------------- delivery --------------------------- */
async function delivery(req, res, id, action) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const q = (req.query.q || '').toLowerCase().trim();
    const like = '%' + q + '%';
    const rows = await sql`
      select dn.id, dn.number, dn.status, dn.created_at, dn.delivered_date,
             o.number as order_number, c.name as customer_name, l.name as location_name,
             (select count(*) from delivery_note_lines dl where dl.delivery_note_id = dn.id) as line_count,
             (select count(*) from invoices i where i.delivery_note_id = dn.id and i.status <> 'cancelled') as invoice_count
      from delivery_notes dn
      left join sales_orders o on o.id = dn.order_id
      left join customers c on c.id = o.customer_id
      left join locations l on l.id = dn.location_id
      where (${q} = '' or lower(coalesce(dn.number,'')) like ${like}
             or lower(coalesce(o.number,'')) like ${like} or lower(coalesce(c.name,'')) like ${like})
      order by dn.id desc limit 500`;
    return send(res, 200, { rows });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  // POST /api/delivery/:id/invoice — raise a draft invoice for this delivery.
  if (action === 'invoice') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const dn = await sql`select * from delivery_notes where id = ${nid}`;
    if (!dn.length) return send(res, 404, { error: 'Delivery note not found.' });
    if (dn[0].status !== 'confirmed') return send(res, 400, { error: 'Confirm the delivery note before invoicing.' });
    const exists = await sql`select id from invoices where delivery_note_id = ${nid} and status <> 'cancelled'`;
    if (exists.length) return send(res, 400, { error: 'An invoice already exists for this delivery note.' });

    const ord = await sql`select * from sales_orders where id = ${dn[0].order_id}`;
    const o = ord[0] || {};
    const vatRate = o.vat_rate != null ? Number(o.vat_rate) : 20;
    const lines = await sql`
      select dl.*, sol.unit_price
      from delivery_note_lines dl
      left join sales_order_lines sol on sol.id = dl.order_line_id
      where dl.delivery_note_id = ${nid} and dl.qty > 0 order by dl.id`;
    if (!lines.length) return send(res, 400, { error: 'Nothing delivered to invoice.' });

    let net = 0;
    const computed = lines.map(l => {
      const price = l.unit_price != null ? Number(l.unit_price) : 0;
      const lineNet = Number(l.qty) * price;
      net += lineNet;
      return { ...l, price, lineNet };
    });
    const vat = net * vatRate / 100;
    const number = await nextNumber('invoice');
    const inv = await sql`
      insert into invoices (number, order_id, customer_id, delivery_note_id, status, vat_rate, net, vat, gross, created_by)
      values (${number}, ${dn[0].order_id}, ${o.customer_id || null}, ${nid}, 'draft', ${vatRate}, ${net}, ${vat}, ${net + vat}, ${Number(session.sub)})
      returning id, number`;
    for (const l of computed) {
      await sql`insert into invoice_lines (invoice_id, order_line_id, batch_id, code, description, quantity, unit_price, net)
        values (${inv[0].id}, ${l.order_line_id}, ${l.batch_id}, ${l.code || null}, ${l.description || null}, ${Number(l.qty)}, ${l.price}, ${l.lineNet})`;
    }
    await setInvoiceDueDate(inv[0].id);   // provisional due date from the customer's terms
    return send(res, 201, { id: inv[0].id, number: inv[0].number });
  }

  if (req.method === 'GET') {
    const head = await sql`
      select dn.*, o.number as order_number, o.customer_id, o.customer_ref, c.name as customer_name,
             pn.number as picking_number, l.name as location_name,
             l.address as collection_address, l.city as collection_city, l.postcode as collection_postcode
      from delivery_notes dn
      left join sales_orders o on o.id = dn.order_id
      left join customers c on c.id = o.customer_id
      left join picking_notes pn on pn.id = dn.picking_note_id
      left join locations l on l.id = dn.location_id
      where dn.id = ${nid}`;
    if (!head.length) return send(res, 404, { error: 'Delivery note not found.' });
    const lines = await sql`
      select dl.*, v.batch_no, v.pack_volume from delivery_note_lines dl
      left join batch_view v on v.id = dl.batch_id
      where dl.delivery_note_id = ${nid} order by dl.id`;
    const invs = await sql`select id, number, status, gross from invoices where delivery_note_id = ${nid} order by id`;
    return send(res, 200, { delivery: head[0], lines, invoices: invs });
  }

  if (req.method === 'PATCH') {
    const bdy = await readJson(req);
    const dnRows = await sql`select * from delivery_notes where id = ${nid}`;
    if (!dnRows.length) return send(res, 404, { error: 'Delivery note not found.' });
    const note = dnRows[0];

    if (bdy.action === 'cancel') {
      if (note.status === 'confirmed') return send(res, 400, { error: 'Cannot cancel a confirmed delivery note.' });
      await sql`update delivery_notes set status = 'cancelled' where id = ${nid}`;
      return send(res, 200, { ok: true });
    }
    if (bdy.action === 'confirm') {
      if (note.status === 'confirmed') return send(res, 400, { error: 'Already confirmed.' });
      if (note.status === 'cancelled') return send(res, 400, { error: 'Delivery note is cancelled.' });
      const locationId = note.location_id;
      if (!locationId) return send(res, 400, { error: 'No location set on this delivery note.' });

      const lines = await sql`select * from delivery_note_lines where delivery_note_id = ${nid}`;
      const overrides = {};
      if (Array.isArray(bdy.lines)) bdy.lines.forEach(l => { overrides[String(l.id)] = Number(l.qty); });

      for (const line of lines) {
        let loaded = overrides[String(line.id)];
        if (loaded == null || !Number.isFinite(loaded)) loaded = Number(line.qty);
        if (loaded < 0) loaded = 0;
        const picked = Number(line.qty_picked || 0);

        if (loaded !== Number(line.qty)) await sql`update delivery_note_lines set qty = ${loaded} where id = ${line.id}`;
        if (line.order_line_id) await sql`update sales_order_lines set qty_delivered = qty_delivered + ${loaded} where id = ${line.order_line_id}`;

        // Physical stock leaves now; release the full picked reservation.
        const packVol = await batchPackVol(line.batch_id);
        await sql`insert into stock_movements (batch_id, location_id, change, reason, ref_type, ref_id, note, created_by)
                  values (${line.batch_id}, ${locationId}, ${-loaded}, 'sale', 'delivery_note', ${nid}, ${note.number}, ${Number(session.sub)})`;
        await sql`
          insert into stock_levels (batch_id, location_id, packs, volume_m3, allocated_packs, avg_cost_per_m3)
          select ${line.batch_id}, ${locationId}, ${-loaded}, ${-loaded * packVol}, ${-picked}, v.landed_cost_per_m3
          from batch_view v where v.id = ${line.batch_id}
          on conflict (batch_id, location_id) do update
            set packs = stock_levels.packs - ${loaded},
                volume_m3 = stock_levels.volume_m3 - ${loaded * packVol},
                allocated_packs = coalesce(stock_levels.allocated_packs,0) - ${picked},
                updated_at = now()`;
      }
      const deliveredDate = bdy.delivered_date || null;
      await sql`update delivery_notes set status = 'confirmed',
                  delivered_date = coalesce(${deliveredDate}::date, current_date), confirmed_at = now()
                where id = ${nid}`;
      await refreshOrdersFromDelivery(nid);
      return send(res, 200, { ok: true });
    }

    for (const col of ['scheduled_date', 'delivered_date', 'delivery_name', 'delivery_address', 'delivery_city', 'delivery_postcode', 'notes']) {
      if (!(col in bdy)) continue;
      let v = bdy[col];
      if (v === '') v = null;
      await deliveryColUpdate(nid, col, v);
    }
    const head = await sql`select * from delivery_notes where id = ${nid}`;
    return send(res, 200, { delivery: head[0] });
  }

  if (req.method === 'DELETE') {
    const dn = await sql`select status from delivery_notes where id = ${nid}`;
    if (dn.length && dn[0].status === 'confirmed') return send(res, 400, { error: 'Cannot delete a confirmed delivery note.' });
    await sql`delete from delivery_notes where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function deliveryColUpdate(id, col, v) {
  switch (col) {
    case 'scheduled_date': return sql`update delivery_notes set scheduled_date = ${v} where id = ${id}`;
    case 'delivered_date': return sql`update delivery_notes set delivered_date = ${v} where id = ${id}`;
    case 'delivery_name': return sql`update delivery_notes set delivery_name = ${v} where id = ${id}`;
    case 'delivery_address': return sql`update delivery_notes set delivery_address = ${v} where id = ${id}`;
    case 'delivery_city': return sql`update delivery_notes set delivery_city = ${v} where id = ${id}`;
    case 'delivery_postcode': return sql`update delivery_notes set delivery_postcode = ${v} where id = ${id}`;
    case 'notes': return sql`update delivery_notes set notes = ${v} where id = ${id}`;
  }
}

/* ----------------------------- invoices --------------------------- */
const INVOICE_STATUS = ['draft', 'issued', 'part_paid', 'paid', 'cancelled'];

// Due date = (EOM ? last day of invoice month : invoice_date) + terms days.
async function setInvoiceDueDate(invoiceId) {
  await sql`
    update invoices i set due_date = (
      (case when coalesce(c.credit_terms_eom, false)
            then (date_trunc('month', i.invoice_date) + interval '1 month' - interval '1 day')::date
            else i.invoice_date end)
      + coalesce(c.credit_terms_days, 30)::int
    )
    from customers c where i.id = ${invoiceId} and c.id = i.customer_id`;
}

// Recompute amount_paid (from allocations) and derive paid/part_paid status.
async function recomputeInvoice(invoiceId) {
  const inv = await sql`select status, gross from invoices where id = ${invoiceId}`;
  if (!inv.length) return;
  const paidRow = await sql`select coalesce(sum(amount),0) as p from payment_allocations where invoice_id = ${invoiceId}`;
  const paid = Number(paidRow[0].p);
  const gross = Number(inv[0].gross) || 0;
  let status = inv[0].status;
  if (status !== 'cancelled' && status !== 'draft') {
    if (paid >= gross && gross > 0) status = 'paid';
    else if (paid > 0) status = 'part_paid';
    else status = 'issued';
  }
  await sql`update invoices set amount_paid = ${paid}, status = ${status} where id = ${invoiceId}`;
}

async function invoices(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const q = (req.query.q || '').toLowerCase().trim();
    const like = '%' + q + '%';
    const cid = req.query.customer_id ? Number(req.query.customer_id) : null;
    const rows = await sql`
      select i.id, i.number, i.status, i.invoice_date, i.due_date, i.net, i.vat, i.gross,
             coalesce(i.amount_paid,0) as amount_paid,
             (coalesce(i.gross,0) - coalesce(i.amount_paid,0)) as outstanding,
             case when i.due_date is not null and i.status in ('issued','part_paid')
                  then greatest(0, (current_date - i.due_date)) else 0 end as days_overdue,
             o.number as order_number, c.name as customer_name, dn.number as delivery_number
      from invoices i
      left join sales_orders o on o.id = i.order_id
      left join customers c on c.id = i.customer_id
      left join delivery_notes dn on dn.id = i.delivery_note_id
      where (${cid}::bigint is null or i.customer_id = ${cid})
        and (${q} = '' or lower(coalesce(i.number,'')) like ${like}
             or lower(coalesce(o.number,'')) like ${like} or lower(coalesce(c.name,'')) like ${like})
      order by i.id desc limit 500`;
    return send(res, 200, { rows });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  if (req.method === 'GET') {
    const head = await sql`
      select i.*, (coalesce(i.gross,0) - coalesce(i.amount_paid,0)) as outstanding,
             o.number as order_number, o.customer_ref, c.name as customer_name,
             c.address as customer_address, c.city as customer_city, c.postcode as customer_postcode,
             dn.number as delivery_number
      from invoices i
      left join sales_orders o on o.id = i.order_id
      left join customers c on c.id = i.customer_id
      left join delivery_notes dn on dn.id = i.delivery_note_id
      where i.id = ${nid}`;
    if (!head.length) return send(res, 404, { error: 'Invoice not found.' });
    const lines = await sql`
      select il.*, v.batch_no, v.thickness_mm, v.width_mm, v.length_mm, v.ppp, v.pack_volume,
             sol.sell_rate_per_m3
      from invoice_lines il
      left join batch_view v on v.id = il.batch_id
      left join sales_order_lines sol on sol.id = il.order_line_id
      where il.invoice_id = ${nid} order by il.id`;
    const allocations = await sql`
      select pa.amount, p.payment_date, p.method, p.reference
      from payment_allocations pa join customer_payments p on p.id = pa.payment_id
      where pa.invoice_id = ${nid} order by p.payment_date, pa.id`;
    return send(res, 200, { invoice: head[0], lines, allocations });
  }

  if (req.method === 'PATCH') {
    const bdy = await readJson(req);
    const inv = await sql`select id from invoices where id = ${nid}`;
    if (!inv.length) return send(res, 404, { error: 'Invoice not found.' });
    if (bdy.status && !INVOICE_STATUS.includes(bdy.status)) return send(res, 400, { error: 'Invalid status.' });
    if (bdy.status) await sql`update invoices set status = ${bdy.status} where id = ${nid}`;
    if ('notes' in bdy) await sql`update invoices set notes = ${bdy.notes || null} where id = ${nid}`;
    if ('invoice_date' in bdy && bdy.invoice_date) await sql`update invoices set invoice_date = ${bdy.invoice_date} where id = ${nid}`;
    // Set/refresh the due date when issuing or when the invoice date changes.
    if (bdy.status === 'issued' || ('invoice_date' in bdy && bdy.invoice_date)) await setInvoiceDueDate(nid);
    const head = await sql`select * from invoices where id = ${nid}`;
    return send(res, 200, { invoice: head[0] });
  }
  if (req.method === 'DELETE') {
    const inv = await sql`select status from invoices where id = ${nid}`;
    if (inv.length && inv[0].status !== 'draft' && inv[0].status !== 'cancelled')
      return send(res, 400, { error: 'Cannot delete an issued/paid invoice. Cancel it instead.' });
    await sql`delete from invoices where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* ----------------------------- payments --------------------------- */
async function payments(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const cid = req.query.customer_id ? Number(req.query.customer_id) : null;
      const rows = await sql`
        select p.*, c.name as customer_name,
               coalesce((select sum(amount) from payment_allocations a where a.payment_id = p.id),0) as allocated
        from customer_payments p left join customers c on c.id = p.customer_id
        where (${cid}::bigint is null or p.customer_id = ${cid})
        order by p.payment_date desc, p.id desc limit 500`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const customerId = b.customer_id ? Number(b.customer_id) : null;
      if (!customerId) return send(res, 400, { error: 'Choose a customer.' });
      const amount = Number(b.amount) || 0;
      if (amount <= 0) return send(res, 400, { error: 'Enter a payment amount.' });
      const allocs = Array.isArray(b.allocations)
        ? b.allocations.map(a => ({ invoice_id: Number(a.invoice_id), amount: Number(a.amount) || 0 })).filter(a => a.invoice_id && a.amount > 0) : [];
      const allocSum = allocs.reduce((s, a) => s + a.amount, 0);
      if (allocSum - amount > 0.005) return send(res, 400, { error: 'Allocated amount exceeds the payment.' });
      const pay = await sql`
        insert into customer_payments (customer_id, amount, payment_date, method, reference, notes, created_by)
        values (${customerId}, ${amount}, coalesce(${b.payment_date || null}::date, current_date),
                ${b.method || null}, ${b.reference || null}, ${b.notes || null}, ${Number(session.sub)})
        returning id`;
      for (const a of allocs) {
        await sql`insert into payment_allocations (payment_id, invoice_id, amount) values (${pay[0].id}, ${a.invoice_id}, ${a.amount})`;
        await recomputeInvoice(a.invoice_id);
      }
      return send(res, 201, { id: pay[0].id });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method === 'DELETE') {
    const inv = await sql`select invoice_id from payment_allocations where payment_id = ${nid}`;
    await sql`delete from customer_payments where id = ${nid}`;   // cascades allocations
    for (const r of inv) await recomputeInvoice(r.invoice_id);
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* --------------------------- staff list --------------------------- */
// Lightweight active-staff list for sales-rep dropdowns (any signed-in user).
async function staffList(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const rows = await sql`select id, name, role from users where active <> false order by name`;
  return send(res, 200, { rows });
}

/* ----------------------- customers (CRM list) --------------------- */
async function customersCrm(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;
  const me = Number(session.sub);

  // List: own customers first, then those contacted longest ago (next to call).
  if (id === undefined) {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const q = (req.query.q || '').toLowerCase().trim();
    const like = '%' + q + '%';
    const rows = await sql`
      select c.id, c.name, c.contact_name, c.email, c.phone, c.city, c.account_no,
             c.sales_rep_id, u.name as sales_rep_name, c.credit_limit,
             (select max(ci.created_at) from customer_interactions ci where ci.customer_id = c.id) as last_contacted,
             coalesce((select sum(coalesce(i.gross,0) - coalesce(i.amount_paid,0)) from invoices i
                       where i.customer_id = c.id and i.status in ('issued','part_paid')),0) as outstanding
      from customers c left join users u on u.id = c.sales_rep_id
      where (${q} = '' or lower(c.name) like ${like} or lower(coalesce(c.contact_name,'')) like ${like}
             or lower(coalesce(c.email,'')) like ${like} or lower(coalesce(c.city,'')) like ${like}
             or lower(coalesce(c.account_no,'')) like ${like})
      order by (c.sales_rep_id = ${me}) desc, last_contacted asc nulls first, c.name
      limit 1000`;
    return send(res, 200, { rows, me });
  }

  // Per-customer summary for the profile: balance, credit, open orders, 6-mo sales.
  const cid = Number(id);
  if (!Number.isInteger(cid) || cid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const acc = await sql`
    select c.credit_limit,
           coalesce((select sum(coalesce(i.gross,0) - coalesce(i.amount_paid,0)) from invoices i
                     where i.customer_id = c.id and i.status in ('issued','part_paid')),0) as outstanding
    from customers c where c.id = ${cid}`;
  if (!acc.length) return send(res, 404, { error: 'Customer not found.' });
  const open = await sql`
    select count(*) as cnt,
           coalesce(sum((select sum(l.quantity * l.unit_price) from sales_order_lines l where l.order_id = o.id)),0) as value
    from sales_orders o where o.customer_id = ${cid} and o.status not in ('cancelled','delivered','invoiced')`;
  const monthly = await sql`
    select to_char(date_trunc('month', i.invoice_date), 'YYYY-MM') as ym, sum(coalesce(i.net,0)) as net
    from invoices i
    where i.customer_id = ${cid} and i.status <> 'cancelled'
      and i.invoice_date >= (date_trunc('month', current_date) - interval '5 months')
    group by 1 order by 1`;
  const limit = acc[0].credit_limit != null ? Number(acc[0].credit_limit) : null;
  const outstanding = Number(acc[0].outstanding) || 0;
  return send(res, 200, {
    credit_limit: limit, outstanding, available: limit != null ? limit - outstanding : null,
    open_orders: { count: Number(open[0].cnt) || 0, value: Number(open[0].value) || 0 },
    monthly
  });
}

/* ----------------------------- dashboard -------------------------- */
async function dashboard(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const inv = await sql`
    select coalesce(sum(case when status in ('issued','part_paid') then coalesce(gross,0)-coalesce(amount_paid,0) else 0 end),0) as receivables,
           coalesce(sum(case when status in ('issued','part_paid') and due_date < current_date then coalesce(gross,0)-coalesce(amount_paid,0) else 0 end),0) as overdue,
           count(*) filter (where status in ('issued','part_paid') and due_date < current_date) as overdue_count,
           count(*) filter (where status in ('issued','part_paid')) as unpaid_count
    from invoices`;
  const ord = await sql`
    select count(*) as cnt,
           coalesce(sum((select sum(l.quantity * l.unit_price) from sales_order_lines l where l.order_id = o.id)),0) as value
    from sales_orders o where o.status not in ('cancelled','invoiced','delivered')`;
  const picks = await sql`
    select count(*) filter (where status = 'open') as to_pick,
           count(*) filter (where status = 'confirmed'
             and not exists (select 1 from delivery_notes dn where dn.picking_note_id = pn.id and dn.status <> 'cancelled')) as awaiting_delivery
    from picking_notes pn`;
  const stockVal = await sql`select coalesce(sum(coalesce(volume_m3,0) * coalesce(avg_cost_per_m3,0)),0) as value from stock_levels`;
  const low = await sql`
    select code, reorder_packs, available from (
      select p.code, p.reorder_packs,
        coalesce((select sum(sl.packs - coalesce(sl.allocated_packs,0)) from stock_levels sl
                  join product_batches b on b.id = sl.batch_id join locations l on l.id = sl.location_id
                  where b.product_id = p.id and l.is_transit = false),0) as available
      from products p where coalesce(p.reorder_packs,0) > 0
    ) t where available <= reorder_packs order by available limit 25`;
  const deliveries = await sql`
    select ho.number, ho.delivery_date, h.name as haulier_name,
           (select count(*) from haulage_order_drops d where d.haulage_order_id = ho.id) as drops
    from haulage_orders ho left join hauliers h on h.id = ho.haulier_id
    where ho.status in ('open','sent') and ho.delivery_date is not null and ho.delivery_date >= current_date
    order by ho.delivery_date limit 10`;
  return send(res, 200, {
    receivables: Number(inv[0].receivables), overdue: Number(inv[0].overdue),
    overdue_count: Number(inv[0].overdue_count), unpaid_count: Number(inv[0].unpaid_count),
    open_orders: Number(ord[0].cnt), open_orders_value: Number(ord[0].value),
    to_pick: Number(picks[0].to_pick), awaiting_delivery: Number(picks[0].awaiting_delivery),
    stock_value: Number(stockVal[0].value), low_stock: low, deliveries
  });
}

/* ------------------------------ reports --------------------------- */
const REPORT_TYPES = ['writeoffs', 'stock_valuation', 'outstanding_orders'];

async function reports(req, res, sub) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (sub === 'run') {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    if (req.query.type === 'writeoffs') return runWriteoffs(req, res);
    if (req.query.type === 'stock_valuation') return runStockValuation(req, res);
    if (req.query.type === 'outstanding_orders') return runOutstandingOrders(req, res);
    return send(res, 400, { error: 'Unknown report type.' });
  }

  if (sub === undefined) {
    if (req.method === 'GET') {
      const rows = await sql`select r.id, r.name, r.type, r.params, u.name as author
                             from report_defs r left join users u on u.id = r.created_by order by r.name`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      if (!REPORT_TYPES.includes(b.type)) return send(res, 400, { error: 'Unknown report type.' });
      const name = (b.name || '').trim();
      if (!name) return send(res, 400, { error: 'Name the report.' });
      const params = b.params && typeof b.params === 'object' ? JSON.stringify(b.params) : null;
      const r = await sql`insert into report_defs (name, type, params, created_by)
                          values (${name}, ${b.type}, ${params}::jsonb, ${Number(session.sub)}) returning id`;
      return send(res, 201, { id: r[0].id });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(sub);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method === 'DELETE') { await sql`delete from report_defs where id = ${nid}`; return send(res, 200, { ok: true }); }
  return send(res, 405, { error: 'Method not allowed' });
}

const WRITEOFF_REASON_LABELS = { lost_order: 'Lost order', office_amendment: 'Office amendment', customer_change: 'Customer change', other: 'Other' };

async function runWriteoffs(req, res) {
  const from = req.query.from || '';
  const to = req.query.to || '';
  const group = ['reason', 'month', 'reason_month'].indexOf(req.query.group_by) >= 0 ? req.query.group_by : 'reason';
  const rows = await sql`
    select w.reason, w.created_at, w.quantity,
           coalesce(v.pack_volume,0) as pack_volume, coalesce(v.sell_rate_per_m3,0) as sell_rate
    from order_write_offs w left join batch_view v on v.id = w.batch_id
    where (${from} = '' or w.created_at::date >= ${from}::date)
      and (${to} = '' or w.created_at::date <= ${to}::date)`;
  const map = {};
  rows.forEach(r => {
    var reasonL = WRITEOFF_REASON_LABELS[r.reason] || r.reason || '—';
    var month = r.created_at ? new Date(r.created_at).toISOString().slice(0, 7) : '—';
    var key = group === 'month' ? month : (group === 'reason_month' ? (month + ' · ' + reasonL) : reasonL);
    var g = map[key] || (map[key] = { group: key, count: 0, packs: 0, m3: 0, value: 0 });
    var m3 = Number(r.quantity) * Number(r.pack_volume);
    g.count++; g.packs += Number(r.quantity); g.m3 += m3; g.value += m3 * Number(r.sell_rate);
  });
  const data = Object.keys(map).map(k => map[k]).sort((a, b) => a.group < b.group ? -1 : 1);
  const totals = { group: 'Total', count: 0, packs: 0, m3: 0, value: 0 };
  data.forEach(d => { totals.count += d.count; totals.packs += d.packs; totals.m3 += d.m3; totals.value += d.value; });
  return send(res, 200, {
    title: 'Write-offs', columns: [
      { key: 'group', label: group === 'month' ? 'Month' : (group === 'reason_month' ? 'Month · Reason' : 'Reason') },
      { key: 'count', label: 'Write-offs' }, { key: 'packs', label: 'Packs' },
      { key: 'm3', label: 'Volume m³', fmt: 'm3' }, { key: 'value', label: 'Sell value', fmt: 'gbp' }
    ], rows: data, totals
  });
}

async function runStockValuation(req, res) {
  const locId = req.query.location_id ? Number(req.query.location_id) : null;
  const group = req.query.group_by === 'location' ? 'location' : 'detail';
  const rows = await sql`
    select v.code, v.batch_no, l.name as location, sl.packs, sl.volume_m3, sl.avg_cost_per_m3,
           (coalesce(sl.volume_m3,0) * coalesce(sl.avg_cost_per_m3,0)) as value
    from stock_levels sl join batch_view v on v.id = sl.batch_id join locations l on l.id = sl.location_id
    where (${locId}::bigint is null or sl.location_id = ${locId}) and sl.packs <> 0
    order by v.code, l.name`;
  let columns, data;
  if (group === 'location') {
    const map = {};
    rows.forEach(r => { var g = map[r.location] || (map[r.location] = { group: r.location, packs: 0, m3: 0, value: 0 }); g.packs += Number(r.packs); g.m3 += Number(r.volume_m3); g.value += Number(r.value); });
    data = Object.keys(map).map(k => map[k]).sort((a, b) => a.group < b.group ? -1 : 1);
    columns = [{ key: 'group', label: 'Location' }, { key: 'packs', label: 'Packs' }, { key: 'm3', label: 'Volume m³', fmt: 'm3' }, { key: 'value', label: 'Value', fmt: 'gbp' }];
  } else {
    data = rows.map(r => ({ group: r.code + (r.batch_no && r.batch_no !== r.code ? ' · ' + r.batch_no : ''), location: r.location, packs: r.packs, m3: r.volume_m3, cost: r.avg_cost_per_m3, value: r.value }));
    columns = [{ key: 'group', label: 'Batch' }, { key: 'location', label: 'Location' }, { key: 'packs', label: 'Packs' }, { key: 'm3', label: 'Volume m³', fmt: 'm3' }, { key: 'cost', label: 'Cost £/m³', fmt: 'gbp' }, { key: 'value', label: 'Value', fmt: 'gbp' }];
  }
  const totals = { group: 'Total', packs: 0, m3: 0, value: 0 };
  data.forEach(d => { totals.packs += Number(d.packs) || 0; totals.m3 += Number(d.m3) || 0; totals.value += Number(d.value) || 0; });
  return send(res, 200, { title: 'Stock valuation', columns, rows: data, totals });
}

async function runOutstandingOrders(req, res) {
  const cid = req.query.customer_id ? Number(req.query.customer_id) : null;
  if (!cid) return send(res, 400, { error: 'Choose a customer.' });
  const rows = await sql`
    select o.number as order_no, o.due_date as due, sol.code, v.batch_no,
           sol.quantity, sol.qty_delivered,
           (coalesce(sol.quantity,0) - coalesce(sol.qty_delivered,0)) as outstanding,
           coalesce((select sum(sl.packs - coalesce(sl.allocated_packs,0)) from stock_levels sl
                     join locations l on l.id = sl.location_id
                     where sl.batch_id = sol.batch_id and l.is_transit = false),0) as available
    from sales_orders o
    join sales_order_lines sol on sol.order_id = o.id
    left join batch_view v on v.id = sol.batch_id
    where o.customer_id = ${cid} and o.status not in ('cancelled','invoiced','delivered')
      and (coalesce(sol.quantity,0) - coalesce(sol.qty_delivered,0)) > 0
    order by o.due_date nulls last, o.number, sol.line_no`;
  const data = rows.map(r => ({
    order_no: r.order_no, due: r.due, code: r.code, batch_no: r.batch_no,
    outstanding: Number(r.outstanding), available: Number(r.available),
    short: Number(r.available) < Number(r.outstanding) ? 'Short' : ''
  }));
  return send(res, 200, {
    title: 'Outstanding orders', columns: [
      { key: 'order_no', label: 'Order' }, { key: 'due', label: 'Due', fmt: 'date' },
      { key: 'code', label: 'Code' }, { key: 'batch_no', label: 'Batch' },
      { key: 'outstanding', label: 'Outstanding' }, { key: 'available', label: 'Available' },
      { key: 'short', label: '' }
    ], rows: data
  });
}

/* ----------------------------- accounts --------------------------- */
async function accounts(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  // Aged debtors summary, one row per customer with an outstanding balance.
  if (id === undefined) {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const rows = await sql`
      select c.id as customer_id, c.name as customer_name, c.credit_limit,
             sum(coalesce(i.gross,0) - coalesce(i.amount_paid,0)) as outstanding,
             sum(case when i.due_date >= current_date or i.due_date is null then coalesce(i.gross,0) - coalesce(i.amount_paid,0) else 0 end) as current_due,
             sum(case when current_date - i.due_date between 1 and 30 then coalesce(i.gross,0) - coalesce(i.amount_paid,0) else 0 end) as d1_30,
             sum(case when current_date - i.due_date between 31 and 60 then coalesce(i.gross,0) - coalesce(i.amount_paid,0) else 0 end) as d31_60,
             sum(case when current_date - i.due_date between 61 and 90 then coalesce(i.gross,0) - coalesce(i.amount_paid,0) else 0 end) as d61_90,
             sum(case when current_date - i.due_date > 90 then coalesce(i.gross,0) - coalesce(i.amount_paid,0) else 0 end) as d90_plus
      from invoices i join customers c on c.id = i.customer_id
      where i.status in ('issued','part_paid') and (coalesce(i.gross,0) - coalesce(i.amount_paid,0)) > 0.005
      group by c.id, c.name, c.credit_limit
      order by outstanding desc`;
    return send(res, 200, { rows });
  }

  // Per-customer statement: details, open/paid invoices, payments, balance.
  const cid = Number(id);
  if (!Number.isInteger(cid) || cid <= 0) return send(res, 400, { error: 'Invalid customer id.' });
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const cust = await sql`select id, name, address, city, postcode, account_no, credit_limit,
                                credit_terms_days, credit_terms_eom from customers where id = ${cid}`;
  if (!cust.length) return send(res, 404, { error: 'Customer not found.' });
  const invs = await sql`
    select i.id, i.number, i.status, i.invoice_date, i.due_date, i.gross,
           coalesce(i.amount_paid,0) as amount_paid,
           (coalesce(i.gross,0) - coalesce(i.amount_paid,0)) as outstanding,
           case when i.due_date is not null and i.status in ('issued','part_paid')
                then greatest(0, (current_date - i.due_date)) else 0 end as days_overdue
    from invoices i where i.customer_id = ${cid} and i.status <> 'cancelled'
    order by i.invoice_date desc, i.id desc`;
  const pays = await sql`select id, amount, payment_date, method, reference from customer_payments
                         where customer_id = ${cid} order by payment_date desc, id desc`;
  const outstanding = invs.filter(i => i.status === 'issued' || i.status === 'part_paid')
                          .reduce((s, i) => s + Number(i.outstanding), 0);
  return send(res, 200, { customer: cust[0], invoices: invs, payments: pays, outstanding });
}

/* -------------------------- product options ----------------------- */
const OPTION_FIELDS = ['category', 'species', 'treatment'];

async function options(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const field = req.query.field;
    if (field && !OPTION_FIELDS.includes(field)) return send(res, 400, { error: 'Unknown option field.' });
    const rows = field
      ? await sql`select id, field, value from product_options where field = ${field} order by value`
      : await sql`select id, field, value from product_options order by field, value`;
    return send(res, 200, { rows });
  }
  if (req.method === 'POST') {
    const b = await readJson(req);
    const field = b.field;
    const value = (b.value || '').trim();
    if (!OPTION_FIELDS.includes(field)) return send(res, 400, { error: 'Unknown option field.' });
    if (!value) return send(res, 400, { error: 'Enter a value.' });
    const rows = await sql`insert into product_options (field, value) values (${field}, ${value})
      on conflict (field, value) do update set value = excluded.value returning id, field, value`;
    return send(res, 201, { row: rows[0] });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* ----------------------------- batches ---------------------------- */
const BATCH_COLS = ['batch_no', 'ppp', 'currency', 'cost_per_m3', 'exchange_rate', 'freight_rate', 'active'];

async function batches(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      // Type-to-search across batches with availability (for the order picker).
      if (req.query.product_id === undefined && req.query.q !== undefined) {
        const ql = ('%' + (req.query.q || '').toLowerCase().trim() + '%');
        const rows = await sql`
          select v.id, v.code, v.batch_no, v.description, v.ppp, v.pack_volume, v.sell_rate_per_m3,
                 v.landed_cost_per_m3, v.cost_per_m3, v.currency,
                 v.purchase_thickness_mm, v.purchase_width_mm, v.purchase_length_mm,
                 (v.pack_volume * v.area_ratio) as purchase_pack_volume,
                 coalesce((select sum(sl.packs - coalesce(sl.allocated_packs,0)) from stock_levels sl
                           join locations l on l.id = sl.location_id
                           where sl.batch_id = v.id and l.is_transit = false),0) as available_packs
          from batch_view v
          where v.active <> false and (lower(v.code) like ${ql} or lower(coalesce(v.batch_no,'')) like ${ql}
                or lower(coalesce(v.description,'')) like ${ql})
          order by v.code, v.batch_no limit 50`;
        return send(res, 200, { rows });
      }
      const productId = Number(req.query.product_id);
      if (!Number.isInteger(productId) || productId <= 0) return send(res, 400, { error: 'product_id required.' });
      const rows = await sql`
        select v.*, coalesce((select sum(packs) from stock_levels sl where sl.batch_id = v.id),0) as total_packs
        from batch_view v where v.product_id = ${productId} order by v.batch_no`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const productId = Number(b.product_id);
      if (!Number.isInteger(productId) || productId <= 0) return send(res, 400, { error: 'product_id required.' });
      const batchNo = (b.batch_no || '').trim();
      if (!batchNo) return send(res, 400, { error: 'Batch number required.' });
      const currency = b.currency === 'GBP' ? 'GBP' : 'EUR';
      const rows = await sql`
        insert into product_batches (product_id, batch_no, ppp, currency, cost_per_m3, exchange_rate, freight_rate)
        values (${productId}, ${batchNo}, ${b.ppp != null && b.ppp !== '' ? Number(b.ppp) : null}, ${currency},
                ${b.cost_per_m3 != null && b.cost_per_m3 !== '' ? Number(b.cost_per_m3) : null},
                ${b.exchange_rate != null && b.exchange_rate !== '' ? Number(b.exchange_rate) : null},
                ${b.freight_rate != null && b.freight_rate !== '' ? Number(b.freight_rate) : null})
        on conflict (product_id, batch_no) do nothing returning id`;
      if (!rows.length) return send(res, 409, { error: 'That batch number already exists for this product.' });
      const v = await sql`select * from batch_view where id = ${rows[0].id}`;
      return send(res, 201, { row: v[0] });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method === 'PATCH') {
    const b = await readJson(req);
    for (const col of BATCH_COLS) {
      if (!(col in b)) continue;
      let v = b[col];
      if (v === '') v = null;
      if (['ppp', 'cost_per_m3', 'exchange_rate', 'freight_rate'].includes(col) && v != null) v = Number(v);
      await batchColUpdate(nid, col, v);
    }
    const v = await sql`select * from batch_view where id = ${nid}`;
    return v.length ? send(res, 200, { row: v[0] }) : send(res, 404, { error: 'Not found.' });
  }
  if (req.method === 'DELETE') {
    const used = await sql`select coalesce(sum(packs),0) as p from stock_levels where batch_id = ${nid}`;
    if (used.length && Number(used[0].p) !== 0) return send(res, 400, { error: 'Batch still holds stock; adjust to zero first.' });
    await sql`delete from product_batches where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function batchColUpdate(id, col, v) {
  switch (col) {
    case 'batch_no': return sql`update product_batches set batch_no = ${v} where id = ${id}`;
    case 'ppp': return sql`update product_batches set ppp = ${v} where id = ${id}`;
    case 'currency': return sql`update product_batches set currency = ${v === 'GBP' ? 'GBP' : 'EUR'} where id = ${id}`;
    case 'cost_per_m3': return sql`update product_batches set cost_per_m3 = ${v} where id = ${id}`;
    case 'exchange_rate': return sql`update product_batches set exchange_rate = ${v} where id = ${id}`;
    case 'freight_rate': return sql`update product_batches set freight_rate = ${v} where id = ${id}`;
    case 'active': return sql`update product_batches set active = ${v === true || v === 'true'} where id = ${id}`;
  }
}

/* --------------------- stock receipt helpers ---------------------- */
// All stock is keyed by BATCH. pack_volume + landed cost come from batch_view.
async function batchPackVol(batchId) {
  const r = await sql`select pack_volume from batch_view where id = ${batchId}`;
  return r.length ? Number(r[0].pack_volume) || 0 : 0;
}

// Landed £/m³ (selling size) for a batch, from its stored currency/cost/
// exchange/freight (see batch_view). EUR divides by exchange + freight;
// GBP is cost × area ratio. No params — edit the batch to change the basis.
async function batchLandedCost(batchId) {
  const r = await sql`select landed_cost_per_m3 from batch_view where id = ${batchId}`;
  return r.length && r[0].landed_cost_per_m3 != null ? Number(r[0].landed_cost_per_m3) : 0;
}

// Add packs to a (batch, location), blending avg cost per m³ (volume-weighted).
async function addStockWeighted(batchId, locationId, packs, costPerM3) {
  const packVol = await batchPackVol(batchId);
  const addVol = packs * packVol;
  const cur = await sql`select volume_m3, avg_cost_per_m3 from stock_levels where batch_id = ${batchId} and location_id = ${locationId}`;
  if (!cur.length) {
    await sql`insert into stock_levels (batch_id, location_id, packs, volume_m3, avg_cost_per_m3)
              values (${batchId}, ${locationId}, ${packs}, ${addVol}, ${costPerM3})`;
    return;
  }
  const oldVol = Number(cur[0].volume_m3) || 0;
  const oldAvg = cur[0].avg_cost_per_m3 != null ? Number(cur[0].avg_cost_per_m3) : 0;
  const newVol = oldVol + addVol;
  const newAvg = newVol > 0 ? (oldVol * oldAvg + addVol * (costPerM3 || 0)) / newVol : (costPerM3 || 0);
  await sql`update stock_levels set packs = packs + ${packs}, volume_m3 = ${newVol}, avg_cost_per_m3 = ${newAvg}, updated_at = now()
            where batch_id = ${batchId} and location_id = ${locationId}`;
}

// Remove packs from a (batch, location) (avg cost unchanged).
async function removeStockPacks(batchId, locationId, packs) {
  const packVol = await batchPackVol(batchId);
  await sql`update stock_levels set packs = packs - ${packs}, volume_m3 = volume_m3 - ${packs * packVol}, updated_at = now()
            where batch_id = ${batchId} and location_id = ${locationId}`;
}

// The single permanent transit bin for stock at sea (no per-voyage bins).
async function onWaterLocationId() {
  const rows = await sql`select id from locations where name = 'On the water' limit 1`;
  if (rows.length) return rows[0].id;
  const ins = await sql`insert into locations (name, code, is_transit, active)
    values ('On the water', 'WATER', true, true)
    on conflict (name) do update set active = true returning id`;
  return ins[0].id;
}

async function refreshPOStatus(poId) {
  const cur = await sql`select status from purchase_orders where id = ${poId}`;
  if (cur.length && cur[0].status === 'cancelled') return;
  const lines = await sql`select quantity, qty_loaded from purchase_order_lines where order_id = ${poId}`;
  const ordered = lines.reduce((a, l) => a + Number(l.quantity || 0), 0);
  const loaded = lines.reduce((a, l) => a + Number(l.qty_loaded || 0), 0);
  let status = 'open';
  if (loaded > 0 && loaded >= ordered && ordered > 0) status = 'loaded';
  else if (loaded > 0) status = 'part_loaded';
  await sql`update purchase_orders set status = ${status} where id = ${poId}`;
}

/* -------------------------- purchase orders ----------------------- */
async function purchasing(req, res, id, action) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const q = (req.query.q || '').toLowerCase().trim();
      const like = '%' + q + '%';
      const rows = await sql`
        select po.id, po.number, po.status, po.order_date, po.expected_date,
               s.name as supplier_name, coalesce(s.currency,'EUR') as currency,
               coalesce((select sum(l.quantity * v.pack_volume * v.area_ratio * l.cost_per_m3)
                         from purchase_order_lines l join batch_view v on v.id = l.batch_id
                         where l.order_id = po.id),0) as cost
        from purchase_orders po left join suppliers s on s.id = po.supplier_id
        where (${q} = '' or lower(coalesce(po.number,'')) like ${like} or lower(coalesce(s.name,'')) like ${like})
        order by po.id desc limit 500`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const bdy = await readJson(req);
      const supplierId = bdy.supplier_id ? Number(bdy.supplier_id) : null;
      if (!supplierId) return send(res, 400, { error: 'Choose a supplier.' });
      const lines = Array.isArray(bdy.lines) ? bdy.lines.filter(l => l && l.batch_id && Number(l.quantity) > 0) : [];
      if (!lines.length) return send(res, 400, { error: 'Add at least one line with a batch and quantity.' });
      const number = await nextNumber('purchase_order');
      const po = await sql`
        insert into purchase_orders (number, supplier_id, status, order_date, expected_date, supplier_ref, notes, created_by)
        values (${number}, ${supplierId}, 'open', coalesce(${bdy.order_date || null}::date, current_date), ${bdy.expected_date || null},
                ${bdy.supplier_ref || null}, ${bdy.notes || null}, ${Number(session.sub)})
        returning id, number`;
      let n = 0;
      for (const l of lines) {
        n++;
        const bid = Number(l.batch_id);
        const bv = await sql`select code, description from batch_view where id = ${bid}`;
        await sql`insert into purchase_order_lines (order_id, line_no, batch_id, code, description, quantity, cost_per_m3)
          values (${po[0].id}, ${n}, ${bid}, ${bv.length ? bv[0].code : (l.code || null)}, ${bv.length ? bv[0].description : (l.description || null)},
                  ${Number(l.quantity)}, ${l.cost_per_m3 != null && l.cost_per_m3 !== '' ? Number(l.cost_per_m3) : 0})`;
      }
      return send(res, 201, { id: po[0].id, number: po[0].number });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  if (req.method === 'GET') {
    const head = await sql`
      select po.*, s.name as supplier_name, s.contact_name as supplier_contact, coalesce(s.currency,'EUR') as currency,
             s.email as supplier_email, s.address as supplier_address, s.city as supplier_city, s.postcode as supplier_postcode
      from purchase_orders po left join suppliers s on s.id = po.supplier_id where po.id = ${nid}`;
    if (!head.length) return send(res, 404, { error: 'Purchase order not found.' });
    // Suppliers see PURCHASE dimensions only — never the selling sizes.
    const lines = await sql`
      select pol.*, v.batch_no, v.purchase_thickness_mm, v.purchase_width_mm, v.purchase_length_mm,
             v.pack_volume, (v.pack_volume * v.area_ratio) as purchase_pack_volume
      from purchase_order_lines pol left join batch_view v on v.id = pol.batch_id
      where pol.order_id = ${nid} order by pol.line_no, pol.id`;
    const loadings = await sql`
      select distinct ll.id, ll.number, ll.status, ll.vessel_name
      from loading_lists ll join loading_list_lines lll on lll.loading_list_id = ll.id
      join purchase_order_lines pol on pol.id = lll.po_line_id
      where pol.order_id = ${nid} order by ll.id`;
    return send(res, 200, { order: head[0], lines, loadings });
  }
  if (req.method === 'PATCH') {
    const bdy = await readJson(req);
    if (bdy.status === 'cancelled') { await sql`update purchase_orders set status = 'cancelled' where id = ${nid}`; }
    for (const col of ['expected_date', 'supplier_ref', 'order_date', 'notes']) {
      if (!(col in bdy)) continue;
      const v = bdy[col] === '' ? null : bdy[col];
      await poColUpdate(nid, col, v);
    }
    const head = await sql`select * from purchase_orders where id = ${nid}`;
    return send(res, 200, { order: head[0] });
  }
  if (req.method === 'DELETE') {
    const po = await sql`select status from purchase_orders where id = ${nid}`;
    if (po.length && po[0].status !== 'open' && po[0].status !== 'cancelled')
      return send(res, 400, { error: 'Cannot delete a purchase order that has stock loaded.' });
    await sql`delete from purchase_orders where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function poColUpdate(id, col, v) {
  switch (col) {
    case 'expected_date': return sql`update purchase_orders set expected_date = ${v} where id = ${id}`;
    case 'order_date': return sql`update purchase_orders set order_date = ${v} where id = ${id}`;
    case 'supplier_ref': return sql`update purchase_orders set supplier_ref = ${v} where id = ${id}`;
    case 'notes': return sql`update purchase_orders set notes = ${v} where id = ${id}`;
  }
}

/* ---------------------------- loading lists ----------------------- */
async function loading(req, res, id, action) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const q = (req.query.q || '').toLowerCase().trim();
      const like = '%' + q + '%';
      const rows = await sql`
        select ll.id, ll.number, ll.status, ll.vessel_name, ll.voyage_ref, ll.load_date, ll.eta_date,
               (select count(*) from loading_list_lines l where l.loading_list_id = ll.id) as line_count
        from loading_lists ll
        where (${q} = '' or lower(coalesce(ll.number,'')) like ${like}
               or lower(coalesce(ll.vessel_name,'')) like ${like} or lower(coalesce(ll.voyage_ref,'')) like ${like})
        order by ll.id desc limit 500`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const bdy = await readJson(req);
      const lines = Array.isArray(bdy.lines) ? bdy.lines.filter(l => l && l.po_line_id && Number(l.quantity) > 0) : [];
      if (!lines.length) return send(res, 400, { error: 'Add at least one line to load from a purchase order.' });
      const number = await nextNumber('loading_list');
      const ll = await sql`
        insert into loading_lists (number, vessel_name, voyage_ref, status, load_date, eta_date, notes, created_by)
        values (${number}, ${bdy.vessel_name || null}, ${bdy.voyage_ref || null}, 'open',
                ${bdy.load_date || null}, ${bdy.eta_date || null}, ${bdy.notes || null}, ${Number(session.sub)})
        returning id, number`;
      for (const l of lines) {
        const pol = await sql`select * from purchase_order_lines where id = ${Number(l.po_line_id)}`;
        if (!pol.length) continue;
        const p = pol[0];
        await sql`insert into loading_list_lines (loading_list_id, po_line_id, batch_id, code, description, quantity, cost_per_m3)
          values (${ll[0].id}, ${p.id}, ${p.batch_id}, ${p.code || null}, ${p.description || null},
                  ${Number(l.quantity)}, ${Number(p.cost_per_m3) || 0})`;
      }
      return send(res, 201, { id: ll[0].id, number: ll[0].number });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  if (req.method === 'GET') {
    const head = await sql`
      select ll.*, l.name as location_name from loading_lists ll
      left join locations l on l.id = ll.location_id where ll.id = ${nid}`;
    if (!head.length) return send(res, 404, { error: 'Loading list not found.' });
    const lines = await sql`
      select lll.*, v.batch_no, v.pack_volume, po.number as po_number, po.id as po_id
      from loading_list_lines lll
      left join batch_view v on v.id = lll.batch_id
      left join purchase_order_lines pol on pol.id = lll.po_line_id
      left join purchase_orders po on po.id = pol.order_id
      where lll.loading_list_id = ${nid} order by lll.id`;
    return send(res, 200, { loading: head[0], lines });
  }

  if (req.method === 'PATCH') {
    const bdy = await readJson(req);
    const llRows = await sql`select * from loading_lists where id = ${nid}`;
    if (!llRows.length) return send(res, 404, { error: 'Loading list not found.' });
    const ll = llRows[0];

    if (bdy.action === 'cancel') {
      if (ll.status === 'loaded' || ll.status === 'arrived') return send(res, 400, { error: 'Cannot cancel a loaded/arrived loading list.' });
      await sql`update loading_lists set status = 'cancelled' where id = ${nid}`;
      return send(res, 200, { ok: true });
    }

    if (bdy.action === 'load') {
      if (ll.status !== 'open') return send(res, 400, { error: 'Loading list is already loaded.' });
      const exchangeRate = bdy.exchange_rate != null && bdy.exchange_rate !== '' ? Number(bdy.exchange_rate) : null;
      if (!exchangeRate || exchangeRate <= 0) return send(res, 400, { error: 'Enter the €→£ exchange rate.' });
      const lines = await sql`select * from loading_list_lines where loading_list_id = ${nid}`;
      if (!lines.length) return send(res, 400, { error: 'Nothing to load.' });
      // All in-transit stock sits in one permanent "On the water" bin; the
      // vessel/voyage detail stays on the loading list itself.
      const vesselLoc = await onWaterLocationId();
      const freightRate = bdy.freight_rate != null && bdy.freight_rate !== '' ? Number(bdy.freight_rate) : null;
      const pos = {};
      for (const line of lines) {
        const qty = Number(line.quantity);
        if (qty <= 0 || !line.batch_id) continue;
        // This shipment's exchange (and freight, if given) live on the batch;
        // cost comes from the loading line. Value at the batch's landed cost.
        await sql`update product_batches set exchange_rate = ${exchangeRate},
                    cost_per_m3 = coalesce(${Number(line.cost_per_m3) || null}, cost_per_m3)
                  where id = ${line.batch_id}`;
        if (freightRate != null) await sql`update product_batches set freight_rate = ${freightRate} where id = ${line.batch_id}`;
        const costPerM3 = await batchLandedCost(line.batch_id);
        await addStockWeighted(line.batch_id, vesselLoc, qty, costPerM3);
        await sql`insert into stock_movements (batch_id, location_id, change, reason, ref_type, ref_id, note, created_by)
                  values (${line.batch_id}, ${vesselLoc}, ${qty}, 'purchase', 'loading_list', ${nid}, ${ll.number}, ${Number(session.sub)})`;
        if (line.po_line_id) {
          await sql`update purchase_order_lines set qty_loaded = qty_loaded + ${qty} where id = ${line.po_line_id}`;
          const pol = await sql`select order_id from purchase_order_lines where id = ${line.po_line_id}`;
          if (pol.length) pos[pol[0].order_id] = true;
        }
      }
      await sql`update loading_lists set status = 'loaded', location_id = ${vesselLoc}, exchange_rate = ${exchangeRate},
                  load_date = coalesce(${bdy.load_date || null}::date, current_date) where id = ${nid}`;
      for (const poId of Object.keys(pos)) await refreshPOStatus(Number(poId));
      return send(res, 200, { ok: true });
    }

    if (bdy.action === 'arrive') {
      if (ll.status !== 'loaded') return send(res, 400, { error: 'Only a loaded voyage can arrive.' });
      const destId = bdy.location_id ? Number(bdy.location_id) : null;
      if (!destId) return send(res, 400, { error: 'Choose the destination port.' });
      const dest = await sql`select id, is_transit from locations where id = ${destId}`;
      if (!dest.length) return send(res, 400, { error: 'Unknown destination location.' });
      if (dest[0].is_transit) return send(res, 400, { error: 'Destination must be a real port, not a transit bin.' });
      const vesselLoc = ll.location_id;
      // Optional final exchange/freight per shipment — applied to each batch.
      const exchangeRate = bdy.exchange_rate != null && bdy.exchange_rate !== '' ? Number(bdy.exchange_rate) : null;
      const freightRate = bdy.freight_rate != null && bdy.freight_rate !== '' ? Number(bdy.freight_rate) : null;

      const lines = await sql`select * from loading_list_lines where loading_list_id = ${nid}`;
      const overrides = {};
      if (Array.isArray(bdy.lines)) bdy.lines.forEach(l => { overrides[String(l.id)] = Number(l.quantity); });

      for (const line of lines) {
        let qty = overrides[String(line.id)];
        if (qty == null || !Number.isFinite(qty)) qty = Number(line.quantity);
        if (qty < 0) qty = 0;
        if (qty > Number(line.quantity)) qty = Number(line.quantity);
        if (qty <= 0 || !line.batch_id) continue;
        if (exchangeRate && exchangeRate > 0) await sql`update product_batches set exchange_rate = ${exchangeRate} where id = ${line.batch_id}`;
        if (freightRate != null) await sql`update product_batches set freight_rate = ${freightRate} where id = ${line.batch_id}`;
        const landed = await batchLandedCost(line.batch_id);
        await removeStockPacks(line.batch_id, vesselLoc, qty);
        await sql`insert into stock_movements (batch_id, location_id, change, reason, ref_type, ref_id, note, created_by)
                  values (${line.batch_id}, ${vesselLoc}, ${-qty}, 'transfer', 'loading_list', ${nid}, ${ll.number}, ${Number(session.sub)})`;
        await addStockWeighted(line.batch_id, destId, qty, landed);
        await sql`insert into stock_movements (batch_id, location_id, change, reason, ref_type, ref_id, note, created_by)
                  values (${line.batch_id}, ${destId}, ${qty}, 'transfer', 'loading_list', ${nid}, ${ll.number}, ${Number(session.sub)})`;
      }
      await sql`update loading_lists set status = 'arrived' where id = ${nid}`;
      // "On the water" is permanent — never deactivated.
      return send(res, 200, { ok: true });
    }

    for (const col of ['vessel_name', 'voyage_ref', 'load_date', 'eta_date', 'notes']) {
      if (!(col in bdy)) continue;
      const v = bdy[col] === '' ? null : bdy[col];
      await loadingColUpdate(nid, col, v);
    }
    const head = await sql`select * from loading_lists where id = ${nid}`;
    return send(res, 200, { loading: head[0] });
  }

  if (req.method === 'DELETE') {
    const ll = await sql`select status from loading_lists where id = ${nid}`;
    if (ll.length && ll[0].status !== 'open' && ll[0].status !== 'cancelled')
      return send(res, 400, { error: 'Cannot delete a loaded/arrived loading list.' });
    await sql`delete from loading_lists where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function loadingColUpdate(id, col, v) {
  switch (col) {
    case 'vessel_name': return sql`update loading_lists set vessel_name = ${v} where id = ${id}`;
    case 'voyage_ref': return sql`update loading_lists set voyage_ref = ${v} where id = ${id}`;
    case 'load_date': return sql`update loading_lists set load_date = ${v} where id = ${id}`;
    case 'eta_date': return sql`update loading_lists set eta_date = ${v} where id = ${id}`;
    case 'notes': return sql`update loading_lists set notes = ${v} where id = ${id}`;
  }
}

/* ------------------------------ haulage --------------------------- */
const HAULAGE_STATUS = ['open', 'sent', 'completed', 'cancelled'];

async function haulage(req, res, id, action) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const q = (req.query.q || '').toLowerCase().trim();
      const like = '%' + q + '%';
      const rows = await sql`
        select ho.id, ho.number, ho.status, ho.collection_date, ho.delivery_date, ho.created_at,
               h.name as haulier_name,
               (select count(*) from haulage_order_drops d where d.haulage_order_id = ho.id) as drop_count,
               coalesce((select sum(d.nett_cost) from haulage_order_drops d where d.haulage_order_id = ho.id),0) as nett
        from haulage_orders ho
        left join hauliers h on h.id = ho.haulier_id
        where (${q} = '' or lower(coalesce(ho.number,'')) like ${like} or lower(coalesce(h.name,'')) like ${like})
        order by ho.id desc limit 500`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const bdy = await readJson(req);
      const haulierId = bdy.haulier_id ? Number(bdy.haulier_id) : null;
      const drops = Array.isArray(bdy.drops) ? bdy.drops.filter(d => d && d.picking_note_id) : [];
      if (!drops.length) return send(res, 400, { error: 'Add at least one drop (picking note).' });
      if (!bdy.collection_date) return send(res, 400, { error: 'Collection date is required.' });
      if (!bdy.delivery_date) return send(res, 400, { error: 'Delivery date is required.' });
      const vat = bdy.vat_rate != null && bdy.vat_rate !== '' ? Number(bdy.vat_rate) : 20;
      const number = await nextNumber('haulage_order');
      const ho = await sql`
        insert into haulage_orders (number, haulier_id, status, collection_date, delivery_date, vat_rate, instructions, notes, created_by)
        values (${number}, ${haulierId}, 'open', ${bdy.collection_date || null}, ${bdy.delivery_date || null}, ${vat}, ${bdy.instructions || null}, ${bdy.notes || null}, ${Number(session.sub)})
        returning id, number`;
      await insertDrops(ho[0].id, drops);
      return send(res, 201, { id: ho[0].id, number: ho[0].number });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  if (req.method === 'GET') {
    const head = await sql`
      select ho.*, h.name as haulier_name, h.contact_name as haulier_contact,
             h.email as haulier_email, h.phone as haulier_phone
      from haulage_orders ho left join hauliers h on h.id = ho.haulier_id
      where ho.id = ${nid}`;
    if (!head.length) return send(res, 404, { error: 'Haulage order not found.' });
    const drops = await sql`
      select d.id, d.drop_no, d.nett_cost, d.notes, d.picking_note_id,
             pn.number as picking_number, pn.status as picking_status,
             o.number as order_number, cu.name as customer_name,
             o.delivery_name, o.delivery_address, o.delivery_city, o.delivery_postcode,
             l.name as collection_name, l.address as collection_address,
             l.city as collection_city, l.postcode as collection_postcode
      from haulage_order_drops d
      left join picking_notes pn on pn.id = d.picking_note_id
      left join sales_orders o on o.id = pn.order_id
      left join customers cu on cu.id = o.customer_id
      left join locations l on l.id = pn.location_id
      where d.haulage_order_id = ${nid}
      order by d.drop_no, d.id`;
    const pnIds = drops.map(d => d.picking_note_id).filter(Boolean);
    const byPn = {};
    if (pnIds.length) {
      const lines = await sql`select picking_note_id, code, description, qty_to_pick
        from picking_note_lines where picking_note_id = any(${pnIds}::bigint[]) order by id`;
      lines.forEach(l => { (byPn[l.picking_note_id] = byPn[l.picking_note_id] || []).push(l); });
    }
    drops.forEach(d => { d.lines = byPn[d.picking_note_id] || []; });
    return send(res, 200, { haulage: head[0], drops });
  }

  if (req.method === 'PATCH') {
    const bdy = await readJson(req);
    const ho = await sql`select id from haulage_orders where id = ${nid}`;
    if (!ho.length) return send(res, 404, { error: 'Haulage order not found.' });
    for (const col of ['haulier_id', 'status', 'collection_date', 'delivery_date', 'vat_rate', 'instructions', 'notes']) {
      if (!(col in bdy)) continue;
      let v = bdy[col];
      if (v === '') v = null;
      if (col === 'status' && v != null && !HAULAGE_STATUS.includes(v)) return send(res, 400, { error: 'Invalid status.' });
      if ((col === 'haulier_id' || col === 'vat_rate') && v != null) v = Number(v);
      await haulageColUpdate(nid, col, v);
    }
    if (Array.isArray(bdy.drops)) {
      await sql`delete from haulage_order_drops where haulage_order_id = ${nid}`;
      await insertDrops(nid, bdy.drops.filter(d => d && d.picking_note_id));
    }
    const head = await sql`select * from haulage_orders where id = ${nid}`;
    return send(res, 200, { haulage: head[0] });
  }
  if (req.method === 'DELETE') {
    await sql`delete from haulage_orders where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function insertDrops(haulageId, drops) {
  let n = 0;
  for (const d of drops) {
    n++;
    const cost = d.nett_cost != null && d.nett_cost !== '' ? Number(d.nett_cost) : 0;
    await sql`insert into haulage_order_drops (haulage_order_id, picking_note_id, drop_no, nett_cost, notes)
      values (${haulageId}, ${Number(d.picking_note_id)}, ${n}, ${cost}, ${d.notes || null})`;
  }
}

async function haulageColUpdate(id, col, v) {
  switch (col) {
    case 'haulier_id': return sql`update haulage_orders set haulier_id = ${v} where id = ${id}`;
    case 'status': return sql`update haulage_orders set status = ${v} where id = ${id}`;
    case 'collection_date': return sql`update haulage_orders set collection_date = ${v} where id = ${id}`;
    case 'delivery_date': return sql`update haulage_orders set delivery_date = ${v} where id = ${id}`;
    case 'vat_rate': return sql`update haulage_orders set vat_rate = ${v} where id = ${id}`;
    case 'instructions': return sql`update haulage_orders set instructions = ${v} where id = ${id}`;
    case 'notes': return sql`update haulage_orders set notes = ${v} where id = ${id}`;
  }
}

/* ----------------------- customer stock lists --------------------- */
async function stocklist(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const cid = Number(req.query.customer_id);
      if (!Number.isInteger(cid) || cid <= 0) return send(res, 400, { error: 'customer_id required.' });
      // Every batch this customer has ordered before.
      const products = await sql`
        select v.id, v.code, v.batch_no, v.description, v.species, v.thickness_mm, v.width_mm, v.length_mm,
               v.ppp, v.pack_volume, v.sell_rate_per_m3
        from batch_view v
        where v.id in (select distinct sol.batch_id from sales_order_lines sol
                       join sales_orders so on so.id = sol.order_id
                       where so.customer_id = ${cid} and sol.batch_id is not null)
        order by v.code, v.batch_no`;
      // Per-bin availability so the list can include/exclude stock locations.
      const ids = products.map(p => p.id);
      const levels = ids.length ? await sql`
        select sl.batch_id, sl.location_id, l.name as location_name, coalesce(l.is_transit,false) as is_transit,
               (coalesce(sl.packs,0) - coalesce(sl.allocated_packs,0)) as available_packs
        from stock_levels sl join locations l on l.id = sl.location_id
        where sl.batch_id = any(${ids}::bigint[]) and coalesce(l.active,true) <> false
          and (coalesce(sl.packs,0) - coalesce(sl.allocated_packs,0)) > 0` : [];
      const byBatch = {};
      const locs = {};
      levels.forEach(r => {
        (byBatch[r.batch_id] = byBatch[r.batch_id] || []).push({ location_id: r.location_id, location_name: r.location_name, available_packs: Number(r.available_packs) });
        locs[r.location_id] = { id: r.location_id, name: r.location_name, is_transit: r.is_transit };
      });
      products.forEach(p => { p.by_location = byBatch[p.id] || []; });
      const saved = await sql`
        select cl.id, cl.name,
               coalesce(array_agg(it.batch_id) filter (where it.batch_id is not null), '{}') as product_ids
        from customer_stock_lists cl
        left join customer_stock_list_items it on it.list_id = cl.id
        where cl.customer_id = ${cid}
        group by cl.id, cl.name order by cl.name`;
      return send(res, 200, { products, saved, locations: Object.values(locs) });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const cid = Number(b.customer_id);
      const name = (b.name || '').trim();
      const ids = Array.isArray(b.product_ids) ? b.product_ids.map(Number).filter(n => Number.isInteger(n) && n > 0) : [];
      if (!Number.isInteger(cid) || cid <= 0) return send(res, 400, { error: 'customer_id required.' });
      if (!name) return send(res, 400, { error: 'Name the list.' });
      if (!ids.length) return send(res, 400, { error: 'Select at least one batch.' });
      const cl = await sql`insert into customer_stock_lists (customer_id, name, created_by)
                           values (${cid}, ${name}, ${Number(session.sub)}) returning id`;
      for (const bid of ids) await sql`insert into customer_stock_list_items (list_id, batch_id) values (${cl[0].id}, ${bid})`;
      return send(res, 201, { id: cl[0].id });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method === 'DELETE') {
    await sql`delete from customer_stock_lists where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* --------------------- customer interactions ---------------------- */
const INTERACTION_TYPES = ['call', 'email', 'visit', 'note'];

async function interactions(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const cid = Number(req.query.customer_id);
      if (!Number.isInteger(cid) || cid <= 0) return send(res, 400, { error: 'customer_id required.' });
      const rows = await sql`
        select ci.*, u.name as author from customer_interactions ci
        left join users u on u.id = ci.created_by
        where ci.customer_id = ${cid} order by ci.created_at desc, ci.id desc`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const cid = Number(b.customer_id);
      if (!Number.isInteger(cid) || cid <= 0) return send(res, 400, { error: 'customer_id required.' });
      const type = INTERACTION_TYPES.includes(b.type) ? b.type : 'note';
      const body = (b.body || '').trim();
      if (!body && !(b.subject || '').trim()) return send(res, 400, { error: 'Enter a note.' });
      const rows = await sql`
        insert into customer_interactions (customer_id, type, subject, body, created_by)
        values (${cid}, ${type}, ${b.subject || null}, ${body || null}, ${Number(session.sub)})
        returning *`;
      return send(res, 201, { row: rows[0] });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });
  if (req.method === 'DELETE') {
    // Author or admin may delete.
    const row = await sql`select created_by from customer_interactions where id = ${nid}`;
    if (!row.length) return send(res, 404, { error: 'Not found.' });
    const isAuthor = String(row[0].created_by) === String(session.sub);
    if (!isAuthor && session.role !== 'admin') return send(res, 403, { error: 'Only the author or an admin can delete this note.' });
    await sql`delete from customer_interactions where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

/* ----------------------- partner contacts ------------------------- */
const PARTNER_TYPES = ['customers', 'suppliers'];

async function contacts(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const pt = req.query.partner_type;
      const pid = Number(req.query.partner_id);
      if (!PARTNER_TYPES.includes(pt)) return send(res, 400, { error: 'Bad partner_type.' });
      if (!Number.isInteger(pid) || pid <= 0) return send(res, 400, { error: 'partner_id required.' });
      const rows = await sql`select * from partner_contacts where partner_type = ${pt} and partner_id = ${pid}
                             order by is_primary desc, id`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const pt = b.partner_type;
      const pid = Number(b.partner_id);
      if (!PARTNER_TYPES.includes(pt)) return send(res, 400, { error: 'Bad partner_type.' });
      if (!Number.isInteger(pid) || pid <= 0) return send(res, 400, { error: 'partner_id required.' });
      const isPrimary = !!b.is_primary;
      const rows = await sql`
        insert into partner_contacts (partner_type, partner_id, name, role, email, phone, notes, is_primary)
        values (${pt}, ${pid}, ${b.name || null}, ${b.role || null}, ${b.email || null}, ${b.phone || null},
                ${b.notes || null}, ${isPrimary}) returning *`;
      if (isPrimary) await sql`update partner_contacts set is_primary = false
                               where partner_type = ${pt} and partner_id = ${pid} and id <> ${rows[0].id}`;
      return send(res, 201, { row: rows[0] });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  if (req.method === 'PATCH') {
    const b = await readJson(req);
    const cur = await sql`select partner_type, partner_id from partner_contacts where id = ${nid}`;
    if (!cur.length) return send(res, 404, { error: 'Not found.' });
    for (const col of ['name', 'role', 'email', 'phone', 'notes']) {
      if (!(col in b)) continue;
      const v = b[col] === '' ? null : b[col];
      await contactColUpdate(nid, col, v);
    }
    if (typeof b.is_primary === 'boolean') {
      await sql`update partner_contacts set is_primary = ${b.is_primary} where id = ${nid}`;
      if (b.is_primary) await sql`update partner_contacts set is_primary = false
                                  where partner_type = ${cur[0].partner_type} and partner_id = ${cur[0].partner_id} and id <> ${nid}`;
    }
    const rows = await sql`select * from partner_contacts where id = ${nid}`;
    return send(res, 200, { row: rows[0] });
  }
  if (req.method === 'DELETE') {
    await sql`delete from partner_contacts where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function contactColUpdate(id, col, v) {
  switch (col) {
    case 'name': return sql`update partner_contacts set name = ${v} where id = ${id}`;
    case 'role': return sql`update partner_contacts set role = ${v} where id = ${id}`;
    case 'email': return sql`update partner_contacts set email = ${v} where id = ${id}`;
    case 'phone': return sql`update partner_contacts set phone = ${v} where id = ${id}`;
    case 'notes': return sql`update partner_contacts set notes = ${v} where id = ${id}`;
  }
}

/* ----------------------- customer addresses ----------------------- */
async function addresses(req, res, id) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (id === undefined) {
    if (req.method === 'GET') {
      const customerId = Number(req.query.customer_id);
      if (!Number.isInteger(customerId) || customerId <= 0) return send(res, 400, { error: 'customer_id required.' });
      const rows = await sql`select * from customer_addresses where customer_id = ${customerId}
                             order by is_default desc, id`;
      return send(res, 200, { rows });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      const customerId = Number(b.customer_id);
      if (!Number.isInteger(customerId) || customerId <= 0) return send(res, 400, { error: 'customer_id required.' });
      const isDefault = !!b.is_default;
      const rows = await sql`
        insert into customer_addresses (customer_id, label, name, address, city, postcode, is_default)
        values (${customerId}, ${b.label || null}, ${b.name || null}, ${b.address || null},
                ${b.city || null}, ${b.postcode || null}, ${isDefault})
        returning *`;
      if (isDefault) await sql`update customer_addresses set is_default = false
                               where customer_id = ${customerId} and id <> ${rows[0].id}`;
      return send(res, 201, { row: rows[0] });
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const nid = Number(id);
  if (!Number.isInteger(nid) || nid <= 0) return send(res, 400, { error: 'Invalid id.' });

  if (req.method === 'PATCH') {
    const b = await readJson(req);
    const cur = await sql`select customer_id from customer_addresses where id = ${nid}`;
    if (!cur.length) return send(res, 404, { error: 'Not found.' });
    const cols = ['label', 'name', 'address', 'city', 'postcode'];
    for (const col of cols) {
      if (!(col in b)) continue;
      const v = b[col] === '' ? null : b[col];
      await addressColUpdate(nid, col, v);
    }
    if (typeof b.is_default === 'boolean') {
      await sql`update customer_addresses set is_default = ${b.is_default} where id = ${nid}`;
      if (b.is_default) await sql`update customer_addresses set is_default = false
                                  where customer_id = ${cur[0].customer_id} and id <> ${nid}`;
    }
    const rows = await sql`select * from customer_addresses where id = ${nid}`;
    return send(res, 200, { row: rows[0] });
  }
  if (req.method === 'DELETE') {
    await sql`delete from customer_addresses where id = ${nid}`;
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' });
}

async function addressColUpdate(id, col, v) {
  switch (col) {
    case 'label': return sql`update customer_addresses set label = ${v} where id = ${id}`;
    case 'name': return sql`update customer_addresses set name = ${v} where id = ${id}`;
    case 'address': return sql`update customer_addresses set address = ${v} where id = ${id}`;
    case 'city': return sql`update customer_addresses set city = ${v} where id = ${id}`;
    case 'postcode': return sql`update customer_addresses set postcode = ${v} where id = ${id}`;
  }
}
