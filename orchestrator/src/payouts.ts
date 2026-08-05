import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { env } from "./env.js";

/** A payout request is only "counted against" the balance while pending or paid. */
const RESERVED_STATUSES = ["pending", "paid"] as const;

export function isValidEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

/** Sum of a user's earnings, minus amounts already withdrawn or in-flight. */
export async function getBalance(userId: string): Promise<{
  earnedTotalUsd: number;
  reservedUsd: number;
  availableUsd: number;
}> {
  const [earned] = await db
    .select({
      total: sql<string>`coalesce(sum(${schema.earnings.amountUsd}), 0)`,
    })
    .from(schema.earnings)
    .where(eq(schema.earnings.userId, userId));

  const [reserved] = await db
    .select({
      total: sql<string>`coalesce(sum(${schema.payouts.amountUsd}), 0)`,
    })
    .from(schema.payouts)
    .where(
      and(
        eq(schema.payouts.userId, userId),
        inArray(schema.payouts.status, [...RESERVED_STATUSES]),
      ),
    );

  const earnedTotalUsd = Number(earned?.total ?? 0);
  const reservedUsd = Number(reserved?.total ?? 0);
  return {
    earnedTotalUsd,
    reservedUsd,
    availableUsd: Math.max(0, earnedTotalUsd - reservedUsd),
  };
}

export async function setPayoutAddress(
  userId: string,
  address: string,
  chainId?: number,
): Promise<void> {
  await db
    .update(schema.users)
    .set({ payoutAddress: address.trim(), payoutChainId: chainId ?? null })
    .where(eq(schema.users.id, userId));
}

export async function getPayoutAddress(
  userId: string,
): Promise<{ address: string | null; chainId: number | null }> {
  const [row] = await db
    .select({
      address: schema.users.payoutAddress,
      chainId: schema.users.payoutChainId,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return { address: row?.address ?? null, chainId: row?.chainId ?? null };
}

export interface PayoutRow {
  id: string;
  amountUsd: number;
  address: string;
  status: string;
  txHash: string | null;
  createdAt: string;
  paidAt: string | null;
}

export async function listPayouts(
  userId: string,
  limit = 10,
): Promise<PayoutRow[]> {
  const rows = await db
    .select()
    .from(schema.payouts)
    .where(eq(schema.payouts.userId, userId))
    .orderBy(desc(schema.payouts.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    amountUsd: Number(r.amountUsd),
    address: r.address,
    status: r.status,
    txHash: r.txHash,
    createdAt: r.createdAt.toISOString(),
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
  }));
}

export class PayoutError extends Error {}

/** Request a withdrawal of the user's full available balance. */
export async function requestPayout(userId: string): Promise<PayoutRow> {
  const { address, chainId } = await getPayoutAddress(userId);
  if (!address || !isValidEvmAddress(address)) {
    throw new PayoutError("Set a valid payout address first");
  }

  const { availableUsd } = await getBalance(userId);
  if (availableUsd < env.payoutThresholdUsd) {
    throw new PayoutError(
      `Minimum payout is $${env.payoutThresholdUsd.toFixed(2)}`,
    );
  }

  const [row] = await db
    .insert(schema.payouts)
    .values({
      userId,
      amountUsd: availableUsd.toFixed(6),
      address,
      chainId: chainId ?? null,
      status: "pending",
    })
    .returning();

  return {
    id: row.id,
    amountUsd: Number(row.amountUsd),
    address: row.address,
    status: row.status,
    txHash: row.txHash,
    createdAt: row.createdAt.toISOString(),
    paidAt: null,
  };
}

export const PAYOUT_THRESHOLD_USD = env.payoutThresholdUsd;
