/**
 * Dependency-free reader for the NuroLockStaking contract on Robinhood Chain.
 * Reads on-chain aggregates (NURO locked / reserved) via a raw JSON-RPC
 * `eth_call` so the data dashboard needs no web3 library.
 *
 * Overridable via env:
 *   VITE_ROBINHOOD_RPC_URL  JSON-RPC endpoint (defaults to Robinhood mainnet)
 *   VITE_STAKING_ADDRESS    NuroLockStaking address
 */
const env = import.meta.env;

export const RPC_URL =
  (env.VITE_ROBINHOOD_RPC_URL as string | undefined) ||
  "https://rpc.mainnet.chain.robinhood.com";

export const STAKING_ADDRESS =
  (env.VITE_STAKING_ADDRESS as string | undefined) ||
  "0xB985e9B2A2C7C0bA3C260a0d1f5353757BA65454";

// $NURO is an 18-decimal ERC-20.
const TOKEN_DECIMALS = 18n;

// Function selectors (first 4 bytes of keccak256 of the signature).
const SELECTORS = {
  totalStaked: "0x817b1cd2", // totalStaked()
  totalReserved: "0xc71b0e1c", // totalReserved()
} as const;

export interface StakingStats {
  /** Principal locked by stakers (NURO, human units). */
  nuroLocked: number;
  /** Rewards reserved for open positions (NURO, human units). */
  nuroReserved: number;
}

/** Convert a 32-byte hex uint256 (base units, 18dp) to human NURO, keeping ~6
 * decimals of precision without overflowing JS floats for large balances. */
function weiHexToNuro(hex: string): number {
  if (!hex || hex === "0x") return 0;
  const wei = BigInt(hex);
  const micro = wei / 10n ** (TOKEN_DECIMALS - 6n); // NURO * 1e6
  return Number(micro) / 1e6;
}

async function ethCall(selector: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: STAKING_ADDRESS, data: selector }, "latest"],
    }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result ?? "0x";
}

export async function getStakingStats(
  signal?: AbortSignal,
): Promise<StakingStats> {
  const [staked, reserved] = await Promise.all([
    ethCall(SELECTORS.totalStaked, signal),
    ethCall(SELECTORS.totalReserved, signal),
  ]);
  return {
    nuroLocked: weiHexToNuro(staked),
    nuroReserved: weiHexToNuro(reserved),
  };
}
