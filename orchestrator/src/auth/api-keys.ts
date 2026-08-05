import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "../db/index.js";

/** Generate an opaque, revocable API key. `nvqsk_` prefix = "nuro secret key". */
export function generateApiKey(): string {
  return `nvqsk_${randomBytes(24).toString("base64url")}`;
}

export interface IssuedApiKey {
  id: string;
  key: string; // full secret - shown to the user exactly once
  label: string | null;
  createdAt: string;
}

export async function issueApiKey(
  userId: string,
  label?: string,
): Promise<IssuedApiKey> {
  const key = generateApiKey();
  const [row] = await db
    .insert(schema.apiKeys)
    .values({ userId, key, label: label ?? null })
    .returning({
      id: schema.apiKeys.id,
      createdAt: schema.apiKeys.createdAt,
    });
  return {
    id: row.id,
    key,
    label: label ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface VerifiedApiKey {
  id: string;
  userId: string;
}

/** Look up a live (non-revoked) API key. Returns null if invalid. */
export async function verifyApiKey(
  key: string | undefined | null,
): Promise<VerifiedApiKey | null> {
  if (!key) return null;
  const rows = await db
    .select({ id: schema.apiKeys.id, userId: schema.apiKeys.userId })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.key, key), isNull(schema.apiKeys.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  void db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, row.id));

  return { id: row.id, userId: row.userId };
}

export async function revokeApiKey(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.userId, userId)))
    .returning({ id: schema.apiKeys.id });
  return result.length > 0;
}

export interface ApiKeyRow {
  id: string;
  key: string; // masked
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const rows = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.userId, userId))
    .orderBy(desc(schema.apiKeys.createdAt));
  return rows.map((r) => ({
    id: r.id,
    key: maskApiKey(r.key),
    label: r.label,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    revoked: r.revokedAt != null,
  }));
}

/** Mask a key for display: nvqsk_ABCD…WXYZ */
export function maskApiKey(key: string): string {
  if (key.length <= 14) return key;
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}
