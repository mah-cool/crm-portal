-- Run this once in the Neon SQL Editor (or `psql`) to create the users table.
-- Neon dashboard → your project → SQL Editor → paste → Run.

create table if not exists users (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  password    text not null,                 -- bcrypt hash, never plaintext
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Case-insensitive lookups on email (we also lower-case before querying).
create unique index if not exists users_email_lower_idx on users (lower(email));
