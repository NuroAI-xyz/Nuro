/**
 * NuroLockStaking contract helpers for the /staking page.
 *
 * Fixed-term staking: lock $NURO for 6 months or 1 year and earn a fixed APY,
 * paid at maturity. Same dependency-free approach as token.ts — raw JSON-RPC
 * `eth_call` for reads and hand-encoded calldata for the actions. Privy's
 * `sendTransaction` broadcasts the calldata we build here.
 */
import { NURO_TOKEN, ROBINHOOD_CHAIN_ID, ROBINHOOD_RPC } from "./token";

/** Deployed NuroLockStaking address (empty keeps the page in preview mode). */
export const STAKING_ADDRESS = (
  (import.meta.env.VITE_STAKING_ADDRESS as string) || ""
).toLowerCase();

export const STAKING_CONFIGURED = /^0x[0-9a-f]{40}$/.test(STAKING_ADDRESS);

/** APY in basis points shown on the page (must match the contract). */
export const STAKING_APY_BPS = Number(
  (import.meta.env.VITE_STAKING_APY_BPS as string) || "1000",
);

/** APY as a percentage number (e.g. 10). */
export const STAKING_APY_PCT = STAKING_APY_BPS / 100;

export enum Term {
  SixMonths = 0,
  OneYear = 1,
}

export const TERM_SECONDS: Record<Term, number> = {
  [Term.SixMonths]: 182 * 24 * 60 * 60,
  [Term.OneYear]: 365 * 24 * 60 * 60,
};

export const TERM_LABEL: Record<Term, string> = {
  [Term.SixMonths]: "6 months",
  [Term.OneYear]: "1 year",
};

/** Effective payout rate for a term at the given APY (e.g. 6mo@10% ≈ 4.98%). */
export function effectiveRatePct(term: Term): number {
  return (STAKING_APY_PCT * TERM_SECONDS[term]) / (365 * 24 * 60 * 60);
}

// Function selectors (cast sig).
const SEL_STAKE = "0x10087fb1"; // stake(uint256,uint8)
const SEL_WITHDRAW = "0x2e1a7d4d"; // withdraw(uint256)
const SEL_EMERGENCY = "0x5312ea8e"; // emergencyWithdraw(uint256)
const SEL_GET_POSITION = "0x3adbb5af"; // getPosition(address,uint256)
const SEL_POSITION_COUNT = "0x42fd3880"; // positionCount(address)
const SEL_QUOTE = "0xfdd75d77"; // quoteReward(uint256,uint8)
const SEL_AVAILABLE = "0x879d9090"; // availableRewards()
const SEL_TOTAL_STAKED = "0x817b1cd2"; // totalStaked()

// ERC-20 selectors for the approval gate.
const SEL_ALLOWANCE = "0xdd62ed3e"; // allowance(address,address)
const SEL_APPROVE = "0x095ea7b3"; // approve(address,uint256)

const MAX_UINT256 = (1n << 256n) - 1n;

function pad32(hexNo0x: string): string {
  return hexNo0x.toLowerCase().padStart(64, "0");
}
function encAddr(addr: string): string {
  return pad32(addr.replace(/^0x/, ""));
}
function encUint(v: bigint): string {
  return pad32(v.toString(16));
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(ROBINHOOD_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await res.json()) as {
    result?: string;
    error?: { message?: string };
  };
  if (json.error) throw new Error(json.error.message || "RPC call failed");
  return json.result ?? "0x";
}

function toBig(result: string): bigint {
  return BigInt(!result || result === "0x" ? "0x0" : result);
}

function wordAt(data: string, index: number): string {
  const start = 2 + index * 64;
  return data.slice(start, start + 64);
}

export interface Position {
  id: number;
  amount: bigint;
  reward: bigint;
  unlockAt: number; // unix seconds
  withdrawn: boolean;
  matured: boolean; // now >= unlockAt
}

export interface StakingSummary {
  totalStaked: bigint;
  availableRewards: bigint;
  positions: Position[];
}

export async function getStakingSummary(user: string): Promise<StakingSummary> {
  const [totalRes, availRes, countRes] = await Promise.all([
    ethCall(STAKING_ADDRESS, SEL_TOTAL_STAKED),
    ethCall(STAKING_ADDRESS, SEL_AVAILABLE),
    ethCall(STAKING_ADDRESS, SEL_POSITION_COUNT + encAddr(user)),
  ]);

  const count = Number(toBig(countRes));
  const now = Math.floor(Date.now() / 1000);

  const positions: Position[] = [];
  const raw = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      ethCall(STAKING_ADDRESS, SEL_GET_POSITION + encAddr(user) + encUint(BigInt(i))),
    ),
  );
  raw.forEach((data, i) => {
    // Position struct: amount, reward, unlockAt(uint64), withdrawn(bool).
    const amount = BigInt("0x" + (wordAt(data, 0) || "0"));
    const reward = BigInt("0x" + (wordAt(data, 1) || "0"));
    const unlockAt = Number(BigInt("0x" + (wordAt(data, 2) || "0")));
    const withdrawn = BigInt("0x" + (wordAt(data, 3) || "0")) !== 0n;
    positions.push({
      id: i,
      amount,
      reward,
      unlockAt,
      withdrawn,
      matured: now >= unlockAt,
    });
  });

  return {
    totalStaked: toBig(totalRes),
    availableRewards: toBig(availRes),
    positions,
  };
}

export async function quoteReward(amount: bigint, term: Term): Promise<bigint> {
  const data = SEL_QUOTE + encUint(amount) + encUint(BigInt(term));
  return toBig(await ethCall(STAKING_ADDRESS, data));
}

export async function getStakeAllowance(owner: string): Promise<bigint> {
  return toBig(
    await ethCall(NURO_TOKEN, SEL_ALLOWANCE + encAddr(owner) + encAddr(STAKING_ADDRESS)),
  );
}

export interface TxRequest {
  to: string;
  data: string;
  chainId: number;
}

export function buildApprove(): TxRequest {
  return {
    to: NURO_TOKEN,
    data: SEL_APPROVE + encAddr(STAKING_ADDRESS) + encUint(MAX_UINT256),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export function buildStake(amount: bigint, term: Term): TxRequest {
  return {
    to: STAKING_ADDRESS,
    data: SEL_STAKE + encUint(amount) + encUint(BigInt(term)),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export function buildWithdraw(positionId: number): TxRequest {
  return {
    to: STAKING_ADDRESS,
    data: SEL_WITHDRAW + encUint(BigInt(positionId)),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export function buildEmergencyWithdraw(positionId: number): TxRequest {
  return {
    to: STAKING_ADDRESS,
    data: SEL_EMERGENCY + encUint(BigInt(positionId)),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}
