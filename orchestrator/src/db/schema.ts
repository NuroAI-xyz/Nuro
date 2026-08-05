import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** A signed-in contributor (keyed by Privy user id / DID). */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Privy DID, e.g. did:privy:...
  email: text("email"),
  handle: text("handle"),
  payoutAddress: text("payout_address"), // EVM wallet for withdrawals
  payoutChainId: integer("payout_chain_id"),
  // --- consumer billing for the public inference API ---
  apiFreeUsed: integer("api_free_used").notNull().default(0), // free requests consumed
  creditsUsd: numeric("credits_usd", { precision: 12, scale: 6 })
    .notNull()
    .default("0"), // prepaid balance (USD-equivalent, funded in USDG / $NURO)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** A worker auth token issued to a user for a given worker class. */
export const workerTokens = pgTable(
  "worker_tokens",
  {
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workerClass: text("worker_class").notNull(), // "native" | "browser"
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("worker_tokens_user_idx").on(t.userId),
  }),
);

/** A worker session (one row per connect). */
export const workers = pgTable(
  "workers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token")
      .notNull()
      .references(() => workerTokens.token, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workerClass: text("worker_class").notNull(),
    executionMode: text("execution_mode").notNull().default("single"),
    gpu: jsonb("gpu"),
    model: jsonb("model"),
    clientVersion: text("client_version"),
    status: text("status").notNull().default("offline"), // "online" | "offline"
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("workers_user_idx").on(t.userId),
    byStatus: index("workers_status_idx").on(t.status),
  }),
);

/** An inference job dispatched to a worker. */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workerId: uuid("worker_id").references(() => workers.id, {
      onDelete: "set null",
    }),
    requesterId: text("requester_id"), // user who requested (null for system)
    model: text("model"),
    status: text("status").notNull().default("queued"), // queued|running|done|error
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    byWorker: index("jobs_worker_idx").on(t.workerId),
    byRequester: index("jobs_requester_idx").on(t.requesterId),
  }),
);

/** Ledger of earnings credited to a contributor for completed jobs. */
export const earnings = pgTable(
  "earnings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id"),
    jobId: uuid("job_id"),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    byUser: index("earnings_user_idx").on(t.userId),
    byCreated: index("earnings_created_idx").on(t.createdAt),
  }),
);

/** An API key for a consumer to call the public inference API. */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(), // opaque secret (like worker tokens)
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("api_keys_user_idx").on(t.userId),
  }),
);

/** Consumer credit movements: grants, deposits (USDG / $NURO), and API charges. */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deltaUsd: numeric("delta_usd", { precision: 12, scale: 6 }).notNull(), // + credit, - charge
    kind: text("kind").notNull(), // grant | deposit | charge
    currency: text("currency"), // USDG | NURO | USD
    ref: text("ref"), // job id, tx hash, etc.
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    byUser: index("credit_ledger_user_idx").on(t.userId),
  }),
);

/** A contributor's request to withdraw accumulated earnings to their address. */
export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 6 }).notNull(),
    address: text("address").notNull(),
    chainId: integer("chain_id"),
    status: text("status").notNull().default("pending"), // pending|paid|failed|cancelled
    txHash: text("tx_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("payouts_user_idx").on(t.userId),
    byStatus: index("payouts_status_idx").on(t.status),
  }),
);
