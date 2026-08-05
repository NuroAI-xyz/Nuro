-- Nuro orchestrator schema - paste into Supabase → SQL Editor → New query → Run.
-- (Or run `pnpm --filter @nuro/orchestrator db:push` with DATABASE_URL set.)

create table if not exists users (
  id          text primary key,               -- Privy DID
  email       text,
  handle      text,
  created_at  timestamptz not null default now()
);

create table if not exists worker_tokens (
  token         text primary key,
  user_id       text not null references users(id) on delete cascade,
  worker_class  text not null,                 -- 'native' | 'browser'
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists worker_tokens_user_idx on worker_tokens(user_id);

create table if not exists workers (
  id                uuid primary key default gen_random_uuid(),
  token             text not null references worker_tokens(token) on delete cascade,
  user_id           text not null references users(id) on delete cascade,
  worker_class      text not null,
  execution_mode    text not null default 'single',
  gpu               jsonb,
  model             jsonb,
  client_version    text,
  status            text not null default 'offline',  -- 'online' | 'offline'
  connected_at      timestamptz not null default now(),
  last_heartbeat_at timestamptz,
  disconnected_at   timestamptz
);
create index if not exists workers_user_idx on workers(user_id);
create index if not exists workers_status_idx on workers(status);

create table if not exists jobs (
  id                uuid primary key default gen_random_uuid(),
  worker_id         uuid references workers(id) on delete set null,
  requester_id      text,
  model             text,
  status            text not null default 'queued',   -- queued|running|done|error
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  error_message     text,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  completed_at      timestamptz
);
create index if not exists jobs_worker_idx on jobs(worker_id);
create index if not exists jobs_requester_idx on jobs(requester_id);

create table if not exists earnings (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references users(id) on delete cascade,
  worker_id   uuid,
  job_id      uuid,
  amount_usd  numeric(12,6) not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists earnings_user_idx on earnings(user_id);
create index if not exists earnings_created_idx on earnings(created_at);
