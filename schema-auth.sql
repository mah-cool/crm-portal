-- =====================================================================
--  User invites + granular per-module permissions
--   * admin generates single-use, expiring invite links
--   * each user has a `permissions` list of allowed module keys
--     (NULL = full access; admins always have full access)
--   Run in Neon any time after schema.sql. Safe to re-run.
-- =====================================================================

alter table users add column if not exists permissions jsonb;   -- null = all modules

create table if not exists invites (
  id          bigint generated always as identity primary key,
  token       text not null unique,
  email       text,                       -- optional: who it's for
  role        text not null default 'staff',
  permissions jsonb,                       -- preset module access for the new user
  created_by  bigint references users(id) on delete set null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     bigint references users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists invites_token_idx on invites (token);
