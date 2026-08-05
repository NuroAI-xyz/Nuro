import { PrivyClient } from "@privy-io/server-auth";
import { env } from "../env.js";
import { db, schema } from "../db/index.js";

const privy = new PrivyClient(env.privyAppId, env.privyAppSecret);

export interface AuthedUser {
  id: string;
}

/**
 * Verify a Privy access token (sent by the signed-in website) and ensure a
 * matching `users` row exists. Returns the Privy user id (DID).
 */
export async function authenticate(bearer: string | undefined): Promise<AuthedUser> {
  const token = extractBearer(bearer);
  if (!token) throw new AuthError("Missing bearer token");

  let userId: string;
  try {
    const claims = await privy.verifyAuthToken(token);
    userId = claims.userId;
  } catch {
    throw new AuthError("Invalid or expired session token");
  }

  await ensureUser(userId);
  return { id: userId };
}

async function ensureUser(userId: string): Promise<void> {
  // Best-effort enrichment (email / handle); never block auth on it.
  let email: string | null = null;
  let handle: string | null = null;
  try {
    const user = await privy.getUser(userId);
    email = user.email?.address ?? null;
    handle = user.twitter?.username ?? null;
  } catch {
    // ignore - enrichment is optional
  }

  await db
    .insert(schema.users)
    .values({ id: userId, email, handle })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: { email, handle },
    });
}

export function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : header.trim() || null;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
