import { eq, sql } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { env } from "./env.js";
import { priceTable, quote, type ModelTier, type TierPrice } from "./pricing.js";
import type { TokenUsage } from "./protocol.js";

export type ConsumerMode = "unlimited" | "free" | "paid";

export interface ConsumerBilling {
  enabled: boolean;
  freeTier: number;
  freeUsed: number;
  freeRemaining: number;
  creditsUsd: number;
  workerRevenueShare: number;
  emissionNuroPer1k: number;
  tiers: Record<ModelTier, TierPrice>;
}

export interface Eligibility {
  allowed: boolean;
  mode: ConsumerMode;
  reason?: string;
}

/** USD-equivalent cost of one completion, charged to the API consumer. */
export function consumerCostUsd(
  model: string | null | undefined,
  usage: TokenUsage,
): number {
  return quote(model, usage).consumerUsd;
}

/** Decide whether a user may make an API call right now (checked pre-dispatch). */
export async function checkConsumerEligibility(
  userId: string,
): Promise<Eligibility> {
  if (!env.billingEnabled) return { allowed: true, mode: "unlimited" };

  const [row] = await db
    .select({
      apiFreeUsed: schema.users.apiFreeUsed,
      creditsUsd: schema.users.creditsUsd,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const freeUsed = row?.apiFreeUsed ?? 0;
  const credits = Number(row?.creditsUsd ?? 0);

  if (freeUsed < env.freeTierRequests) return { allowed: true, mode: "free" };
  if (credits > 0) return { allowed: true, mode: "paid" };

  return {
    allowed: false,
    mode: "paid",
    reason:
      `You've used all ${env.freeTierRequests} free requests. ` +
      `Add credits (USDG or $NURO) to keep using the API.`,
  };
}

/** Record usage after a completion: consume a free request or deduct credits. */
export async function recordConsumerUsage(
  userId: string,
  mode: ConsumerMode,
  usage: TokenUsage,
  model: string | null | undefined,
  jobRef?: string,
): Promise<void> {
  if (mode === "unlimited") return; // dev / billing disabled

  if (mode === "free") {
    await db
      .update(schema.users)
      .set({ apiFreeUsed: sql`${schema.users.apiFreeUsed} + 1` })
      .where(eq(schema.users.id, userId));
    return;
  }

  // paid: charge credits (never below zero) and record the ledger entry.
  const cost = consumerCostUsd(model, usage);
  if (cost <= 0) return;
  await db
    .update(schema.users)
    .set({
      creditsUsd: sql`greatest(0, ${schema.users.creditsUsd} - ${cost})`,
    })
    .where(eq(schema.users.id, userId));
  await db.insert(schema.creditLedger).values({
    userId,
    deltaUsd: (-cost).toFixed(6),
    kind: "charge",
    currency: "USD",
    ref: jobRef ?? null,
  });
}

/** Billing summary for the dashboard. */
export async function getConsumerBilling(
  userId: string,
): Promise<ConsumerBilling> {
  const [row] = await db
    .select({
      apiFreeUsed: schema.users.apiFreeUsed,
      creditsUsd: schema.users.creditsUsd,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const freeUsed = row?.apiFreeUsed ?? 0;
  const table = priceTable();
  return {
    enabled: env.billingEnabled,
    freeTier: env.freeTierRequests,
    freeUsed,
    freeRemaining: Math.max(0, env.freeTierRequests - freeUsed),
    creditsUsd: Number(row?.creditsUsd ?? 0),
    workerRevenueShare: table.workerRevenueShare,
    emissionNuroPer1k: table.emissionNuroPer1k,
    tiers: table.tiers,
  };
}
