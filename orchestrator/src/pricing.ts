import { env } from "./env.js";
import type { TokenUsage } from "./protocol.js";

export type ModelTier = "small" | "mid" | "large";

export interface TierPrice {
  inputPer1k: number; // USD per 1K prompt tokens
  outputPer1k: number; // USD per 1K completion tokens
}

// Market-anchored defaults (USD per 1K tokens) for open-weight models, with a
// modest privacy premium over commodity managed APIs. Retune live via
// PRICING_JSON without a code change. For reference, per 1M tokens:
//   small ~= $0.06 in / $0.24 out   (8B tier; market ~$0.05-0.20/1M)
//   mid   ~= $0.30 in / $0.90 out   (13-34B tier)
//   large ~= $0.80 in / $2.00 out   (70B tier)
const DEFAULT_PRICES: Record<ModelTier, TierPrice> = {
  small: { inputPer1k: 0.00006, outputPer1k: 0.00024 },
  mid: { inputPer1k: 0.0003, outputPer1k: 0.0009 },
  large: { inputPer1k: 0.0008, outputPer1k: 0.002 },
};

function loadPrices(): Record<ModelTier, TierPrice> {
  if (!env.pricingJson) return DEFAULT_PRICES;
  try {
    const override = JSON.parse(env.pricingJson) as Partial<
      Record<ModelTier, Partial<TierPrice>>
    >;
    const merged = {} as Record<ModelTier, TierPrice>;
    for (const tier of ["small", "mid", "large"] as ModelTier[]) {
      merged[tier] = { ...DEFAULT_PRICES[tier], ...(override[tier] ?? {}) };
    }
    return merged;
  } catch {
    return DEFAULT_PRICES;
  }
}

export const PRICES = loadPrices();

// Classify a model string into a size tier by its parameter count.
const LARGE = /(65|70|72|100|120|175|180|235|405)\s*b/i;
const MID = /(13|14|20|24|27|30|32|34)\s*b/i;

/** Best-effort model → tier from the model name/ref (defaults to small). */
export function modelTier(model: string | null | undefined): ModelTier {
  const m = (model ?? "").toLowerCase();
  if (LARGE.test(m) || /\blarge\b/.test(m)) return "large";
  if (MID.test(m) || /\bmedium\b/.test(m)) return "mid";
  return "small";
}

export interface Quote {
  tier: ModelTier;
  /** Full market price billed to the API consumer. */
  consumerUsd: number;
  /** Paid to the contributor who ran the job (revenue share of consumerUsd). */
  workerUsd: number;
  /** Platform margin (consumerUsd - workerUsd). */
  platformUsd: number;
  /** Optional $NURO emission reward for serving this job (0 when off). */
  emissionNuro: number;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Price a completed (or projected) job from its model tier and token usage. */
export function quote(
  model: string | null | undefined,
  usage: TokenUsage,
): Quote {
  const tier = modelTier(model);
  const price = PRICES[tier];
  const inK = (usage.promptTokens || 0) / 1000;
  const outK = (usage.completionTokens || 0) / 1000;

  const consumerUsd = round6(inK * price.inputPer1k + outK * price.outputPer1k);
  const workerUsd = round6(consumerUsd * env.workerRevenueShare);
  const platformUsd = round6(consumerUsd - workerUsd);
  const emissionNuro = round6((inK + outK) * env.emissionNuroPer1k);

  return { tier, consumerUsd, workerUsd, platformUsd, emissionNuro };
}

/** The current price table + share, for display on the dashboard. */
export function priceTable(): {
  workerRevenueShare: number;
  emissionNuroPer1k: number;
  tiers: Record<ModelTier, TierPrice>;
} {
  return {
    workerRevenueShare: env.workerRevenueShare,
    emissionNuroPer1k: env.emissionNuroPer1k,
    tiers: PRICES,
  };
}
