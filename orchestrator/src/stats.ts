import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { maskToken } from "./auth/tokens.js";
import { listApiKeys, type ApiKeyRow } from "./auth/api-keys.js";
import { getConsumerBilling, type ConsumerBilling } from "./billing.js";
import { registry } from "./registry.js";
import { env } from "./env.js";
import {
  getBalance,
  getPayoutAddress,
  listPayouts,
  PAYOUT_THRESHOLD_USD,
  type PayoutRow,
} from "./payouts.js";

export interface UserStats {
  earnedTodayUsd: number;
  earnedTotalUsd: number;
  jobsCompleted: number;
  workersOnline: number;
  uptimeSeconds: number;
  tokensPerSecond: number;
  workers: Array<{
    id: string;
    workerClass: string;
    modelId: string | null;
    status: "online" | "offline";
    connectedAt: string;
  }>;
  tokens: Array<{
    token: string; // masked
    workerClass: string;
    label: string | null;
    createdAt: string;
    revoked: boolean;
  }>;
  payout: {
    address: string | null;
    availableUsd: number;
    thresholdUsd: number;
    canRequest: boolean;
    history: PayoutRow[];
  };
  apiKeys: ApiKeyRow[];
  billing: ConsumerBilling;
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const [totalRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${schema.earnings.amountUsd}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.earnings)
    .where(eq(schema.earnings.userId, userId));

  const [todayRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${schema.earnings.amountUsd}), 0)`,
    })
    .from(schema.earnings)
    .where(
      and(
        eq(schema.earnings.userId, userId),
        gte(schema.earnings.createdAt, startOfUtcToday()),
      ),
    );

  // Throughput from the most recent completed job with a measurable duration.
  const [lastJob] = await db
    .select({
      completionTokens: schema.jobs.completionTokens,
      startedAt: schema.jobs.startedAt,
      completedAt: schema.jobs.completedAt,
    })
    .from(schema.jobs)
    .innerJoin(schema.workers, eq(schema.jobs.workerId, schema.workers.id))
    .where(and(eq(schema.workers.userId, userId), eq(schema.jobs.status, "done")))
    .orderBy(desc(schema.jobs.completedAt))
    .limit(1);

  let tokensPerSecond = 0;
  if (lastJob?.startedAt && lastJob.completedAt) {
    const secs =
      (lastJob.completedAt.getTime() - lastJob.startedAt.getTime()) / 1000;
    if (secs > 0) tokensPerSecond = (lastJob.completionTokens || 0) / secs;
  }

  const liveWorkers = registry.onlineForUser(userId);
  const now = Date.now();
  const uptimeSeconds = liveWorkers.reduce(
    (acc, w) => acc + (now - w.connectedAt) / 1000,
    0,
  );

  const tokenRows = await db
    .select()
    .from(schema.workerTokens)
    .where(eq(schema.workerTokens.userId, userId))
    .orderBy(desc(schema.workerTokens.createdAt));

  const [{ availableUsd }, payoutAddr, payoutHistory, apiKeys, billing] =
    await Promise.all([
      getBalance(userId),
      getPayoutAddress(userId),
      listPayouts(userId),
      listApiKeys(userId),
      getConsumerBilling(userId),
    ]);

  return {
    earnedTodayUsd: Number(todayRow?.total ?? 0),
    earnedTotalUsd: Number(totalRow?.total ?? 0),
    jobsCompleted: Number(totalRow?.count ?? 0),
    workersOnline: liveWorkers.length,
    uptimeSeconds: Math.round(uptimeSeconds),
    tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
    workers: liveWorkers.map((w) => ({
      id: w.workerId,
      workerClass: w.workerClass,
      modelId: w.model?.id ?? null,
      status: "online" as const,
      connectedAt: new Date(w.connectedAt).toISOString(),
    })),
    tokens: tokenRows.map((t) => ({
      token: maskToken(t.token),
      workerClass: t.workerClass,
      label: t.label,
      createdAt: t.createdAt.toISOString(),
      revoked: t.revokedAt != null,
    })),
    payout: {
      address: payoutAddr.address,
      availableUsd,
      thresholdUsd: PAYOUT_THRESHOLD_USD,
      canRequest:
        Boolean(payoutAddr.address) && availableUsd >= PAYOUT_THRESHOLD_USD,
      history: payoutHistory,
    },
    apiKeys,
    billing,
  };
}

export interface NetworkStats {
  workersOnline: number;
  nativeOnline: number;
  browserOnline: number;
  jobsInQueue: number;
}

export function getNetworkStats(): NetworkStats {
  const counts = registry.counts();
  const floor = env.displayWorkerFloor;
  return {
    workersOnline: counts.total + floor,
    nativeOnline: counts.native + floor,
    browserOnline: counts.browser,
    jobsInQueue: registry.queuedCount(),
  };
}
