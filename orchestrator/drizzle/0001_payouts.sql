-- Payouts: contributor withdrawal address + withdrawal requests.
-- Idempotent; safe to re-run. Apply after 0000_init.sql.

alter table users add column if not exists payout_address text;
alter table users add column if not exists payout_chain_id integer;

create table if not exists payouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references users(id) on delete cascade,
  amount_usd  numeric(12,6) not null,
  address     text not null,
  chain_id    integer,
  status      text not null default 'pending',  -- pending|paid|failed|cancelled
  tx_hash     text,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index if not exists payouts_user_idx on payouts(user_id);
create index if not exists payouts_status_idx on payouts(status);
