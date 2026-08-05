/**
 * Server-authoritative entitlement metering for the in-app assistant.
 *
 * Free trials and purchased credits are tracked in a single HMAC-SIGNED cookie
 * (`nvq_ent`). Signing means the browser can read but not FORGE the balance —
 * tampering invalidates the signature and the state resets to a fresh free tier.
 * This keeps the gate honest with no database; purchased credits are only ever
 * incremented by the server after it verifies an on-chain USDC payment
 * (`/api/credits`), and redeemed tx hashes are recorded to block replay.
 *
 * NOTE (scope): the cookie is per-browser, so credits do not roam across
 * devices and free trials reset if a user clears cookies. Moving this to a
 * per-identity ledger (Privy DID -> orchestrator credit_ledger) is the
 * production upgrade; the wire format here is deliberately small so that swap
 * is drop-in.
 */
import crypto from "node:crypto";

const COOKIE = "nvq_ent";
const FREE_LIMIT = Number(process.env.FREE_TIER ?? 5);
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SECRET =
  process.env.SESSION_SECRET ||
  // Dev fallback so local runs work without config; set SESSION_SECRET in prod.
  "nuro-dev-entitlements-secret-change-me";

export interface EntitlementState {
  freeUsed: number;
  credits: number;
  redeemed: string[]; // tx hashes already credited (replay guard)
}

export interface EntitlementView {
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number;
  credits: number;
  totalRemaining: number;
}

const FRESH: EntitlementState = { freeUsed: 0, credits: 0, redeemed: [] };

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(payload).digest());
}

function serialize(state: EntitlementState): string {
  const payload = b64url(Buffer.from(JSON.stringify(state)));
  return `${payload}.${sign(payload)}`;
}

function deserialize(value: string | undefined): EntitlementState {
  if (!value) return { ...FRESH };
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return { ...FRESH };
  // constant-time compare; reject forged/edited cookies by resetting to fresh.
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ...FRESH };
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return {
      freeUsed: Math.max(0, Number(parsed.freeUsed) || 0),
      credits: Math.max(0, Number(parsed.credits) || 0),
      redeemed: Array.isArray(parsed.redeemed)
        ? parsed.redeemed.slice(-200).map(String)
        : [],
    };
  } catch {
    return { ...FRESH };
  }
}

function readCookie(request: Request): string | undefined {
  const header = request.headers.get("Cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function getState(request: Request): EntitlementState {
  return deserialize(readCookie(request));
}

export function view(state: EntitlementState): EntitlementView {
  const freeRemaining = Math.max(0, FREE_LIMIT - state.freeUsed);
  return {
    freeLimit: FREE_LIMIT,
    freeUsed: state.freeUsed,
    freeRemaining,
    credits: state.credits,
    totalRemaining: freeRemaining + state.credits,
  };
}

export function canSpend(state: EntitlementState): boolean {
  return view(state).totalRemaining > 0;
}

/** Consume one message: free tier first, then a purchased credit. */
export function spendOne(state: EntitlementState): EntitlementState {
  if (FREE_LIMIT - state.freeUsed > 0) {
    return { ...state, freeUsed: state.freeUsed + 1 };
  }
  return { ...state, credits: Math.max(0, state.credits - 1) };
}

export function grantCredits(
  state: EntitlementState,
  amount: number,
  txHash: string,
): EntitlementState {
  return {
    ...state,
    credits: state.credits + Math.max(0, Math.floor(amount)),
    redeemed: [...state.redeemed, txHash.toLowerCase()].slice(-200),
  };
}

export function alreadyRedeemed(state: EntitlementState, txHash: string): boolean {
  return state.redeemed.includes(txHash.toLowerCase());
}

/** Set-Cookie header value persisting the (signed) state. */
export function cookieHeader(state: EntitlementState): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(
    serialize(state),
  )}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; HttpOnly${secure}`;
}
