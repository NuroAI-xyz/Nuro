/**
 * NuroStaking contract helpers for the /staking page.
 *
 * Same dependency-free approach as token.ts: raw JSON-RPC `eth_call` for reads
 * and hand-encoded calldata for the four user actions (stake / unstake / claim /
 * compound), plus ERC-20 allowance/approve so we can gate the stake button on a
 * sufficient allowance. Keeps viem/ethers out of the bundle — Privy's
 * `sendTransaction` broadcasts the calldata we build here.
 */
import { NURO_TOKEN, ROBINHOOD_CHAIN_ID, ROBINHOOD_RPC } from "./token";

/** Deployed NuroStaking address (empty string keeps the page in preview mode). */
export const STAKING_ADDRESS = (
  (import.meta.env.VITE_STAKING_ADDRESS as string) || ""
).toLowerCase();

export const STAKING_CONFIGURED = /^0x[0-9a-f]{40}$/.test(STAKING_ADDRESS);

// Staking function selectors (cast sig).
const SEL_STAKE = "0xa694fc3a"; // stake(uint256)
const SEL_UNSTAKE = "0x2e17de78"; // unstake(uint256)
const SEL_CLAIM = "0x4e71d92d"; // claim()
const SEL_COMPOUND = "0xf69e2046"; // compound()
const SEL_TOTAL_STAKED = "0x817b1cd2"; // totalStaked()
const SEL_PENDING = "0x31d7a262"; // pendingRewards(address)
const SEL_COOLDOWN = "0x7eefd5ae"; // unstakeCooldown()
const SEL_UNLOCK_TIME = "0x76b467b7"; // unlockTime(address)
const SEL_USERS = "0xa87430ba"; // users(address)
const SEL_REWARD_IS_STAKE = "0x35b1adb0"; // rewardIsStake()
const SEL_TOKENS_SET = "0xd1d7d350"; // tokensSet()

// ERC-20 selectors used for the approval gate.
const SEL_ALLOWANCE = "0xdd62ed3e"; // allowance(address,address)
const SEL_APPROVE = "0x095ea7b3"; // approve(address,uint256)

const MAX_UINT256 =
  (1n << 256n) - 1n; // approve amount for a one-time unlimited allowance

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

/** A staker's on-chain position + pool context, all in base units. */
export interface StakePosition {
  staked: bigint; // user principal
  pending: bigint; // claimable rewards right now
  totalStaked: bigint; // pool total
  unlockTime: bigint; // unix seconds; unstake allowed at/after this
  cooldown: bigint; // configured cooldown in seconds
  rewardIsStake: boolean; // whether compound() is available
  tokensSet: boolean; // whether staking is live on-chain
}

export async function getTotalStaked(): Promise<bigint> {
  return toBig(await ethCall(STAKING_ADDRESS, SEL_TOTAL_STAKED));
}

/** Read everything the UI needs for `user` in a handful of parallel calls. */
export async function getStakePosition(user: string): Promise<StakePosition> {
  const [usersRes, pendingRes, totalRes, unlockRes, cooldownRes, rewardRes, setRes] =
    await Promise.all([
      ethCall(STAKING_ADDRESS, SEL_USERS + encAddr(user)),
      ethCall(STAKING_ADDRESS, SEL_PENDING + encAddr(user)),
      ethCall(STAKING_ADDRESS, SEL_TOTAL_STAKED),
      ethCall(STAKING_ADDRESS, SEL_UNLOCK_TIME + encAddr(user)),
      ethCall(STAKING_ADDRESS, SEL_COOLDOWN),
      ethCall(STAKING_ADDRESS, SEL_REWARD_IS_STAKE),
      ethCall(STAKING_ADDRESS, SEL_TOKENS_SET),
    ]);

  // users() returns (amount, rewardDebt, pending, lastStakeTime) — first word
  // is the staked principal.
  const amountWord = usersRes && usersRes !== "0x" ? usersRes.slice(2, 66) : "0";
  return {
    staked: BigInt("0x" + (amountWord || "0")),
    pending: toBig(pendingRes),
    totalStaked: toBig(totalRes),
    unlockTime: toBig(unlockRes),
    cooldown: toBig(cooldownRes),
    rewardIsStake: toBig(rewardRes) !== 0n,
    tokensSet: toBig(setRes) !== 0n,
  };
}

/** Current $NURO allowance the staking contract may pull from `owner`. */
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

/** Approve the staking contract to spend $NURO (unlimited, one-time). */
export function buildApprove(): TxRequest {
  return {
    to: NURO_TOKEN,
    data: SEL_APPROVE + encAddr(STAKING_ADDRESS) + encUint(MAX_UINT256),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export function buildStake(amount: bigint): TxRequest {
  return {
    to: STAKING_ADDRESS,
    data: SEL_STAKE + encUint(amount),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export function buildUnstake(amount: bigint): TxRequest {
  return {
    to: STAKING_ADDRESS,
    data: SEL_UNSTAKE + encUint(amount),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export function buildClaim(): TxRequest {
  return { to: STAKING_ADDRESS, data: SEL_CLAIM, chainId: ROBINHOOD_CHAIN_ID };
}

export function buildCompound(): TxRequest {
  return { to: STAKING_ADDRESS, data: SEL_COMPOUND, chainId: ROBINHOOD_CHAIN_ID };
}
