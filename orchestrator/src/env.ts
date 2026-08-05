import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

const isProd = process.env.NODE_ENV === "production";

// Billing is metered only in production so localhost dev is always free.
// Override explicitly with BILLING_ENABLED=true|false.
const billingOverride = optional("BILLING_ENABLED", "");
const billingEnabled =
  billingOverride === "" ? isProd : billingOverride === "true";

export const env = {
  port: Number(optional("PORT", "8787")),
  databaseUrl: required("DATABASE_URL"),
  privyAppId: required("PRIVY_APP_ID"),
  privyAppSecret: required("PRIVY_APP_SECRET"),
  allowedOrigins: optional(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://nuroai.xyz,https://www.nuroai.xyz,https://data.nuroai.xyz",
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  pingIntervalMs: Number(optional("PING_INTERVAL_SEC", "30")) * 1000,
  payoutThresholdUsd: Number(optional("PAYOUT_THRESHOLD_USD", "10")),
  // Shared secret for admin-only routes (e.g. seed-worker token provisioning).
  // Leave blank to disable those routes entirely.
  adminSecret: optional("ADMIN_SECRET", ""),
  // Cosmetic baseline added to the *displayed* online-worker counts (network
  // stats + data site) so the network doesn't read as empty while bootstrapping.
  // Display-only: it does NOT create real capacity, so inference still needs a
  // real worker online. Set to 0 to show true counts.
  displayWorkerFloor: Math.max(0, Number(optional("DISPLAY_WORKER_FLOOR", "0"))),
  isProd,
  // --- consumer billing (public inference API) ---
  billingEnabled,
  // Free API requests per user before credits are required.
  freeTierRequests: Number(optional("FREE_TIER_REQUESTS", "5")),
  // Fraction of a job's market price paid to the worker (rest is platform margin).
  // Clamped to [0,1]. Guarantees payout is always < revenue.
  workerRevenueShare: Math.min(
    1,
    Math.max(0, Number(optional("WORKER_REVENUE_SHARE", "0.8"))),
  ),
  // Optional $NURO emission reward per 1K tokens served (bootstrap subsidy).
  // 0 = off until the token is deployed.
  emissionNuroPer1k: Number(optional("EMISSION_NURO_PER_1K", "0")),
  // Optional JSON override of the per-tier price table (see pricing.ts).
  // e.g. {"small":{"inputPer1k":0.00008,"outputPer1k":0.0003}}
  pricingJson: optional("PRICING_JSON", ""),
} as const;
