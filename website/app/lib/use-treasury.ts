import { useMemo } from "react";
import { isConfigured } from "./chain";

export interface TreasurySeriesPoint {
  /** Unix ms timestamp for the sample. */
  t: number;
  /** Cumulative value at that time. */
  v: number;
}

export interface TreasuryData {
  /** Cumulative $NURO burned forever (whole tokens). */
  burnedForever: number;
  /** Percent of total supply removed by burns. */
  burnedPctSupply: number;
  /** Number of buyback batches executed so far. */
  buybackCount: number;

  /** Total value returned to holders + stakers (USDC). */
  returnedTotalUsd: number;

  /** $NURO currently staked (whole tokens). */
  staked: number;
  /** Percent of supply staked. */
  stakedPctSupply: number;

  /** USDC spent buying $NURO back off the market. */
  totalSpentBuybacksUsd: number;
  /** USDC paid to stakers as real yield. */
  stakerRewardsPaidUsd: number;
  /** USDC accrued in treasury awaiting the next buyback. */
  pendingBuybackUsd: number;

  /** Cumulative burned time series. */
  burnedSeries: TreasurySeriesPoint[];
  /** Staked-over-time series (rises on stakes, dips on unstakes). */
  stakedSeries: TreasurySeriesPoint[];
}

const DAY = 86_400_000;

/** Deterministic pseudo-random in [0,1) so preview charts are stable across renders. */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Build a concave, mostly-monotonic "cumulative" curve toward `target`
 * (used for burns - only ever goes up).
 */
function cumulativeCurve(days: number, target: number, seed: number): number[] {
  const rand = seeded(seed);
  const out: number[] = [];
  let v = 0;
  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1);
    // Concave easing so it rises fast then flattens, like real buyback cadence.
    const eased = 1 - Math.pow(1 - progress, 1.8);
    const jitter = 1 + (rand() - 0.5) * 0.04;
    v = Math.max(v, target * eased * jitter);
    out.push(v);
  }
  out[out.length - 1] = target;
  return out;
}

/**
 * Build a rising series that dips occasionally (used for staked balance -
 * grows over time but drops when people unstake).
 */
function stakedCurve(days: number, target: number, seed: number): number[] {
  const rand = seeded(seed);
  const out: number[] = [];
  let v = target * 0.06;
  for (let i = 0; i < days; i++) {
    const drift = target * 0.012 * rand();
    const dip = rand() > 0.86 ? -target * 0.03 * rand() : 0;
    v = Math.max(target * 0.04, v + drift + dip);
    out.push(v);
  }
  out[out.length - 1] = target;
  return out;
}

function toSeries(values: number[], endMs: number): TreasurySeriesPoint[] {
  const n = values.length;
  return values.map((v, i) => ({ t: endMs - (n - 1 - i) * DAY, v }));
}

/**
 * Treasury metrics for the dashboard.
 *
 * Returns clearly-labelled preview data until the on-chain contracts / indexer
 * are wired (`preview: true`). Once `isConfigured` is true, replace the body
 * with real reads: burns from the token's burn/dead address, staked from the
 * staking contract's `totalStaked`, and USDC flows from a treasury indexer.
 */
export function useTreasury(): { data: TreasuryData; preview: boolean } {
  return useMemo(() => {
    const endMs = Date.now();
    const days = 49;

    // --- Preview figures (stand-ins until live data is wired) ---
    const totalSupply = 1_000_000_000;
    const burnedForever = 19_500_459;
    const staked = 113_650_000;

    const burnedSeriesVals = cumulativeCurve(days, burnedForever, 7);
    const stakedSeriesVals = stakedCurve(days, staked, 23);

    const totalSpentBuybacksUsd = 25_851.38;
    const stakerRewardsPaidUsd = 25_847.9;
    const pendingBuybackUsd = 67.62;

    const data: TreasuryData = {
      burnedForever,
      burnedPctSupply: (burnedForever / totalSupply) * 100,
      buybackCount: 54,

      returnedTotalUsd: totalSpentBuybacksUsd + stakerRewardsPaidUsd,

      staked,
      stakedPctSupply: (staked / totalSupply) * 100,

      totalSpentBuybacksUsd,
      stakerRewardsPaidUsd,
      pendingBuybackUsd,

      burnedSeries: toSeries(burnedSeriesVals, endMs),
      stakedSeries: toSeries(stakedSeriesVals, endMs),
    };

    return { data, preview: !isConfigured };
  }, []);
}
