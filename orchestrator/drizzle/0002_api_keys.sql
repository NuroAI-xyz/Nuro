-- API keys: consumer credentials for the public inference API.
-- Idempotent; safe to re-run. Apply after 0001_payouts.sql.

create table if not exists api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references users(id) on delete cascade,
  key           text not null unique,
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists api_keys_user_idx on api_keys(user_id);
