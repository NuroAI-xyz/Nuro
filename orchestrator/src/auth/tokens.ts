import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { WorkerClass } from "../protocol.js";

/** Generate an opaque, revocable worker token (stored in DB). */
export function generateWorkerToken(): string {
  return `nvq_${randomBytes(24).toString("base64url")}`;
}

/** Synthetic account that owns first-party "seed" workers (the bootstrap fleet). */
export const SEED_USER_ID = "system:seed";

/** Ensure the seed user row exists so seed worker tokens satisfy the FK. */
export async function ensureSeedUser(): Promise<void> {
  await db
    .insert(schema.users)
    .values({ id: SEED_USER_ID, handle: "nuro-seed" })
    .onConflictDoNothing();
}

export interface IssuedToken {
  token: string;
  workerClass: WorkerClass;
}

export async function issueWorkerToken(
  userId: string,
  workerClass: WorkerClass,
  label?: string,
): Promise<IssuedToken> {
  const token = generateWorkerToken();
  await db.insert(schema.workerTokens).values({
    token,
    userId,
    workerClass,
    label: label ?? null,
  });
  return { token, workerClass };
}

export interface VerifiedWorkerToken {
  token: string;
  userId: string;
  workerClass: WorkerClass;
}

/** Look up a live (non-revoked) worker token. Returns null if invalid. */
export async function verifyWorkerToken(
  token: string | undefined | null,
): Promise<VerifiedWorkerToken | null> {
  if (!token) return null;
  const rows = await db
    .select()
    .from(schema.workerTokens)
    .where(
      and(
        eq(schema.workerTokens.token, token),
        isNull(schema.workerTokens.revokedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Fire-and-forget last-used bump.
  void db
    .update(schema.workerTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.workerTokens.token, token));

  return {
    token: row.token,
    userId: row.userId,
    workerClass: row.workerClass as WorkerClass,
  };
}

export async function revokeWorkerToken(
  userId: string,
  token: string,
): Promise<boolean> {
  const result = await db
    .update(schema.workerTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.workerTokens.token, token),
        eq(schema.workerTokens.userId, userId),
      ),
    )
    .returning({ token: schema.workerTokens.token });
  return result.length > 0;
}

/** Mask a token for display: nvq_ABCD…WXYZ */
export function maskToken(token: string): string {
  if (token.length <= 12) return token;
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}
