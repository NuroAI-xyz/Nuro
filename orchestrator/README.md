# @nuro/orchestrator

The worker control plane for Nuro - a standalone Node service deployed at
`orchestrator.nuroai.xyz`. It:

- accepts **worker WebSocket** connections at `/v1/worker` (the protocol
  `@nuro/worker` speaks),
- issues and verifies **worker tokens** from a signed-in Privy session,
- **dispatches inference jobs** to online workers and **meters earnings**,
- serves a public, **OpenAI-compatible inference API** (`/v1/chat/completions`)
  authenticated with per-user **API keys**,
- exposes user + network **stats** for the website's `/earn` page.

## Stack

Fastify (HTTP) + `ws` (WebSocket) + Drizzle ORM over **Supabase Postgres** +
`@privy-io/server-auth` for token verification.

## Setup

1. **Database (Supabase):** create a project, then apply every migration in
   [`drizzle/`](./drizzle/) in filename order (`0000_init.sql`, `0001_payouts.sql`,
   `0002_api_keys.sql`) via the Supabase SQL Editor - or, with `DATABASE_URL` set,
   run `node scripts/setup-db.mjs` (idempotent) or `pnpm --filter @nuro/orchestrator db:push`.
2. **Env:** `cp .env.example .env` and fill in `DATABASE_URL` (Supabase
   *Transaction* pooler string, port 6543), `PRIVY_APP_ID`, `PRIVY_APP_SECRET`,
   and `ALLOWED_ORIGINS` (the website origins).
3. **Run:**
   ```bash
   pnpm --filter @nuro/orchestrator dev     # tsx watch
   # or
   pnpm --filter @nuro/orchestrator build && pnpm --filter @nuro/orchestrator start
   ```

## HTTP API

All authenticated routes take `Authorization: Bearer <privy-access-token>`
(from the website's `getAccessToken()`).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET`  | `/health` | - | Liveness |
| `POST` | `/v1/worker-token` | Privy | Issue a worker token `{ workerClass, label? }` → `{ token }` |
| `POST` | `/v1/tokens/:token/revoke` | Privy | Revoke a token you own |
| `GET`  | `/v1/me/stats` | Privy | Dashboard stats (earnings, workers, tokens, tok/s) |
| `GET`  | `/v1/network` | - | Public network stats (workers online, queue) |
| `GET`  | `/v1/network/overview` | - | Aggregate totals + live counts + 30-day series (data dashboard) |
| `POST` | `/v1/test-job` | Privy | Dispatch `{ prompt }` to one of your online workers; **SSE** stream of `token` / `done` / `error` |
| `POST` | `/v1/api-keys` | Privy | Create an API key `{ label? }` → full secret (shown once) |
| `GET`  | `/v1/api-keys` | Privy | List your API keys (masked) |
| `POST` | `/v1/api-keys/:id/revoke` | Privy | Revoke an API key you own |
| `POST` | `/v1/chat/completions` | **API key** | Public OpenAI-compatible chat completions (see below) |

### Public inference API — `POST /v1/chat/completions`

OpenAI-compatible. Authenticate with `Authorization: Bearer <api-key>` (a
`nvqsk_…` key from `/v1/api-keys`). Body mirrors OpenAI:

```jsonc
{
  "model": "llama3.2",         // optional; routed to any available worker if omitted
  "messages": [{ "role": "user", "content": "Hello" }],
  "stream": true,               // SSE `data: {chunk}` … `data: [DONE]`; false → single JSON body
  "max_tokens": 256             // optional
}
```

The request is dispatched to an available (non-busy) worker; the **contributor**
who runs that worker is credited via the normal earnings meter. Returns `503`
when no worker is online. Any OpenAI SDK works by setting the base URL to
`<orchestrator>/v1` and the API key.

**Pricing (`src/pricing.ts`).** Consumer price is **market-anchored per model
tier** (small / mid / large, priced separately for input vs output tokens; see
the defaults and per-1M references in `pricing.ts`). Retune any value live via
`PRICING_JSON` - no redeploy. Worker payout is a **revenue share** of each job's
market price (`WORKER_REVENUE_SHARE`, default **0.8**), so payout is always less
than revenue by construction - no underwater jobs. An optional `$NURO`
emission reward (`EMISSION_NURO_PER_1K`, default off) is the lever for
bootstrapping supply without inflating USD payouts.

**Consumer billing / free tier.** Each user gets `FREE_TIER_REQUESTS` (default
**5**) free API calls; after that a positive **credit balance** is required
(`credits_usd`, a USD-equivalent funded in **USDG** or **$NURO**), charged at
the tiered price above and recorded in `credit_ledger`. Out of free requests
with no credits → `402 insufficient_credits`. Billing is **disabled in
development** (localhost is always free) and enabled in production; override with
`BILLING_ENABLED=true|false`. On-chain top-ups land with the $NURO token deployment.

## WebSocket `/v1/worker`

Implements the `@nuro/worker` protocol:

- **in:** `register` → `registered`; `heartbeat` / `pong`; `job_token` /
  `job_complete` / `job_error`
- **out:** `registered`, `job`, `ping`, `error`

Native workers authenticate via the `Authorization` header **and** the token in
the `register` payload; browser workers via the `register` payload only.

## Deploy

`Dockerfile` builds a production image (`node dist/index.js` on `:8787`). Put it
behind TLS at `orchestrator.nuroai.xyz` so the worker's default
`wss://orchestrator.nuroai.xyz/v1/worker` resolves.
