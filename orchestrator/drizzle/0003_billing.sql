-- Consumer billing for the public inference API: free tier + prepaid credits.
-- Credits are USD-equivalent, funded in USDG or $NURO (tracked in credit_ledger).
-- Idempotent; safe to re-run. Apply after 0002_api_keys.sql.

alter table users add column if not exists api_free_used integer not null default 0;
alter table users add column if not exists credits_usd numeric(12,6) not null default 0;

create table if not exists credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references users(id) on delete cascade,
  delta_usd   numeric(12,6) not null,          -- + credit, - charge
  kind        text not null,                   -- grant | deposit | charge
  currency    text,                            -- USDG | NURO | USD
  ref         text,                            -- job id, tx hash, etc.
  created_at  timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on credit_ledger(user_id);
