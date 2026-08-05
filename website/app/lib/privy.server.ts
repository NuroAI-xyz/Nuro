/**
 * Server-side Privy auth-token verification.
 *
 * The assistant requires a signed-in user: the browser sends the Privy access
 * token as `Authorization: Bearer <token>` and this verifies it against the
 * app's Privy credentials. If Privy isn't configured on the server we fail
 * open (allow) so a missing secret can't lock everyone out — but with
 * PRIVY_APP_ID/PRIVY_APP_SECRET set (as in prod), a valid token is mandatory.
 */
import { PrivyClient } from "@privy-io/server-auth";

let client: PrivyClient | null = null;

function getClient(): PrivyClient | null {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return null;
  if (!client) client = new PrivyClient(appId, appSecret);
  return client;
}

/** Returns { authorized, userId }. `authorized` is true when the token is
 * valid, or when Privy isn't configured on the server (fail-open). */
export async function verifyRequestUser(
  request: Request,
): Promise<{ authorized: boolean; userId: string | null }> {
  const privy = getClient();
  if (!privy) return { authorized: true, userId: null };

  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return { authorized: false, userId: null };

  try {
    const claims = await privy.verifyAuthToken(token);
    return { authorized: true, userId: claims.userId };
  } catch {
    return { authorized: false, userId: null };
  }
}
