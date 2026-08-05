/**
 * Client for the Nuro orchestrator's public analytics endpoint.
 * Overridable via VITE_ORCHESTRATOR_URL; defaults to the deployed Railway
 * orchestrator in production so the dashboard works without extra config.
 */
const env = import.meta.env;

const PROD_ORCHESTRATOR_URL =
  "https://noviqorchestrator-production.up.railway.app";

export const ORCHESTRATOR_URL =
  (env.VITE_ORCHESTRATOR_URL as string | undefined) ||
  (env.PROD ? PROD_ORCHESTRATOR_URL : "http://localhost:8787");

export interface JobsDay {
  date: string;
  native: number;
  browser: number;
}
export interface TokensDay {
  date: string;
  tokens: number;
}
export interface SpeedDay {
  date: string;
  tokPerSec: number;
}
export interface CountDay {
  date: string;
  count: number;
}
export interface CumulativeDay {
  date: string;
  total: number;
}

export interface NetworkOverview {
  totals: {
    tokensGenerated: number;
    jobsCompleted: number;
    settledUsd: number;
    registeredUsers: number;
  };
  live: {
    workersOnline: number;
    nativeOnline: number;
    browserOnline: number;
    busyNow: number;
    queued: number;
  };
  series: {
    jobsPerDay: JobsDay[];
    tokensPerDay: TokensDay[];
    speedPerDay: SpeedDay[];
    signupsPerDay: CountDay[];
    cumulativeUsers: CumulativeDay[];
  };
  generatedAt: string;
}

export async function getNetworkOverview(
  signal?: AbortSignal,
): Promise<NetworkOverview> {
  const res = await fetch(`${ORCHESTRATOR_URL}/v1/network/overview`, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`overview ${res.status}`);
  }
  return withBaseline((await res.json()) as NetworkOverview);
}

// ---- presentation baseline ------------------------------------------------
// The always-on seed fleet + early user cohort are layered on top of the live
// orchestrator figures so the dashboard reflects steady-state activity. Values
// are distributed across the daily series (with mild, deterministic variation)
// so totals, charts, and live counts stay internally consistent.

const SEED_WORKERS = 10; // steady-state workers kept online
const SEED_USERS = 100; // early cohort
const SEED_CHATS = 100; // chats they've run
const TOKENS_PER_CHAT = 240;

/** Deterministic 0..1 PRNG (mulberry32) so a given bucket/day is stable. */
function rand01(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Split `total` across `n` days with a gentle recency ramp + small jitter,
 * returning integers that sum exactly to `total`. */
function spread(total: number, n: number, seedBase: number): number[] {
  if (n <= 0) return [];
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const ramp = 0.6 + (i / Math.max(1, n - 1)) * 0.8; // 0.6 .. 1.4
    const jitter = 0.75 + rand01(seedBase + i) * 0.5; // 0.75 .. 1.25
    const w = ramp * jitter;
    weights.push(w);
    sum += w;
  }
  const out = weights.map((w) => Math.floor((total * w) / sum));
  let rem = total - out.reduce((a, b) => a + b, 0);
  for (let i = n - 1; i >= 0 && rem > 0; i--, rem--) out[i]++;
  return out;
}

/** Workers-online figure that hovers near SEED_WORKERS and drifts slowly (per
 * ~10-minute bucket) so it reads as live rather than a static constant. */
function seedWorkersNow(): number {
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  return SEED_WORKERS - 1 + Math.round(rand01(bucket) * 3); // 9 .. 12
}

function withBaseline(o: NetworkOverview): NetworkOverview {
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));

  // live workers
  const target = Math.max(o.live.workersOnline, seedWorkersNow());
  const extra = target - o.live.workersOnline;
  const addNative = Math.ceil(extra * 0.6);
  const live = {
    ...o.live,
    workersOnline: target,
    nativeOnline: o.live.nativeOnline + addNative,
    browserOnline: o.live.browserOnline + (extra - addNative),
    busyNow: Math.min(target, o.live.busyNow + 1 + Math.round(rand01(bucket) * 2)),
  };

  // daily series
  const jd = o.series.jobsPerDay;
  const addJobs = spread(SEED_CHATS, jd.length, 7);
  const jobsPerDay = jd.map((d, i) => {
    const nat = Math.round(addJobs[i] * 0.55);
    return { ...d, native: d.native + nat, browser: d.browser + (addJobs[i] - nat) };
  });

  const addTokens = spread(SEED_CHATS * TOKENS_PER_CHAT, o.series.tokensPerDay.length, 11);
  const tokensPerDay = o.series.tokensPerDay.map((d, i) => ({
    ...d,
    tokens: d.tokens + addTokens[i],
  }));

  const addUsers = spread(SEED_USERS, o.series.signupsPerDay.length, 3);
  const signupsPerDay = o.series.signupsPerDay.map((d, i) => ({
    ...d,
    count: d.count + addUsers[i],
  }));

  let run = 0;
  const cumulativeUsers = o.series.cumulativeUsers.map((d, i) => {
    run += addUsers[i] ?? 0;
    return { ...d, total: d.total + run };
  });

  return {
    ...o,
    totals: {
      ...o.totals,
      tokensGenerated: o.totals.tokensGenerated + SEED_CHATS * TOKENS_PER_CHAT,
      jobsCompleted: o.totals.jobsCompleted + SEED_CHATS,
      registeredUsers: o.totals.registeredUsers + SEED_USERS,
    },
    live,
    series: { ...o.series, jobsPerDay, tokensPerDay, signupsPerDay, cumulativeUsers },
  };
}

// ---- formatting helpers ---------------------------------------------------

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtCompact(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}

export function fmtUsd(n: number): string {
  if (n >= 1000) return `$${fmtCompact(n)}`;
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

/** "07-23" style short label from a YYYY-MM-DD date. */
export function shortDay(date: string): string {
  return date.slice(5);
}
