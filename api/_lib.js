// Shared helpers for the auth API (Vercel serverless functions + Neon).
import { neon } from '@neondatabase/serverless';
import { SignJWT, jwtVerify } from 'jose';

export const sql = neon(process.env.DATABASE_URL);

const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

// --- JSON body parsing (Vercel usually parses, but be defensive) ----------
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  // Fallback: read the raw stream.
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return {}; }
}

// --- Session token <-> cookie --------------------------------------------
export async function createToken(user) {
  return new SignJWT({ email: user.email, name: user.name, role: user.role || 'staff' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

// Returns the session payload { sub, email, name } or null.
export async function getSession(req) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const token = match.slice(COOKIE.length + 1);
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

// Guards: return the session, or write a 401/403 and return null.
export async function requireUser(req, res) {
  const s = await getSession(req);
  if (!s) { send(res, 401, { error: 'Not authenticated.' }); return null; }
  return s;
}

export async function requireAdmin(req, res) {
  const s = await requireUser(req, res);
  if (!s) return null;
  if (s.role !== 'admin') { send(res, 403, { error: 'Admins only.' }); return null; }
  return s;
}

// --- Validation -----------------------------------------------------------
export function validate({ email, password, name }, { requireName = false } = {}) {
  const errors = [];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters.');
  if (requireName && (!name || !name.trim())) errors.push('Name is required.');
  return errors;
}

export function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
