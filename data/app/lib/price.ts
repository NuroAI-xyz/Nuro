/**
 * $NURO market data from the DexScreener public API (no key required, CORS
 * enabled). Reads the live SushiSwap v3 pair on Robinhood Chain.
 *
 * Overridable via env:
 *   VITE_DEX_CHAIN  DexScreener chain slug (default "robinhood")
 *   VITE_DEX_PAIR   pair address
 */
const env = import.meta.env;

export const DEX_CHAIN =
  (env.VITE_DEX_CHAIN as string | undefined) || "robinhood";

export const DEX_PAIR =
  (env.VITE_DEX_PAIR as string | undefined) ||
  "0x3c6c0a1ce3537054f9ed8563a18a16d69db1364b";

export const DEX_URL = `https://dexscreener.com/${DEX_CHAIN}/${DEX_PAIR}`;

export interface TokenMarket {
  priceUsd: number;
  priceNative: string;
  priceChange: { m5: number; h1: number; h6: number; h24: number };
  volume24h: number;
  liquidityUsd: number;
  marketCap: number;
  fdv: number;
  dexId: string;
  baseSymbol: string;
  quoteSymbol: string;
  url: string;
}

interface DexPair {
  dexId?: string;
  url?: string;
  baseToken?: { symbol?: string };
  quoteToken?: { symbol?: string };
  priceNative?: string;
  priceUsd?: string;
  volume?: Partial<Record<"m5" | "h1" | "h6" | "h24", number>>;
  priceChange?: Partial<Record<"m5" | "h1" | "h6" | "h24", number>>;
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function getTokenMarket(
  signal?: AbortSignal,
): Promise<TokenMarket> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/pairs/${DEX_CHAIN}/${DEX_PAIR}`,
    { signal, headers: { accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`dexscreener ${res.status}`);
  const json = (await res.json()) as { pairs?: DexPair[] };
  const p = json.pairs?.[0];
  if (!p) throw new Error("pair not found");

  return {
    priceUsd: num(p.priceUsd),
    priceNative: p.priceNative ?? "0",
    priceChange: {
      m5: num(p.priceChange?.m5),
      h1: num(p.priceChange?.h1),
      h6: num(p.priceChange?.h6),
      h24: num(p.priceChange?.h24),
    },
    volume24h: num(p.volume?.h24),
    liquidityUsd: num(p.liquidity?.usd),
    marketCap: num(p.marketCap),
    fdv: num(p.fdv),
    dexId: p.dexId ?? "dex",
    baseSymbol: p.baseToken?.symbol ?? "NURO",
    quoteSymbol: p.quoteToken?.symbol ?? "",
    url: p.url ?? DEX_URL,
  };
}

// ---- formatting ------------------------------------------------------------

/** Price with adaptive precision for sub-cent tokens (e.g. $0.00002590). */
export function fmtPrice(n: number): string {
  if (n <= 0) return "$0";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
  // Show enough significant digits for very small prices.
  const decimals = Math.min(12, Math.max(4, Math.ceil(-Math.log10(n)) + 3));
  return `$${n.toFixed(decimals)}`;
}

export function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
