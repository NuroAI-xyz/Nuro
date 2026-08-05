import type { TokenUsage } from "./protocol.js";
import { quote } from "./pricing.js";

/**
 * USD paid to the contributor for a completed job: a revenue share of the
 * job's market price (by model tier + token usage). Computed for every job -
 * even free/dev ones - so it always reflects the market value of the work.
 * Always < the price billed to the consumer (share is clamped to [0,1]).
 */
export function computeEarningUsd(
  model: string | null | undefined,
  usage: TokenUsage,
): number {
  return quote(model, usage).workerUsd;
}
