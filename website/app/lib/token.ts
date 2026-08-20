/**
 * Robinhood Chain (EVM) + $NURO token helpers.
 *
 * Deliberately dependency-free: we talk to the chain over raw JSON-RPC
 * (`eth_call`) and hand-encode the two ERC-20 calls we need (balanceOf +
 * transfer). This keeps viem/ethers out of the client bundle — the Privy SDK
 * already carries a wallet stack, and the profile page only needs to read a
 * balance and build one transfer.
 */

export const ROBINHOOD_CHAIN_ID = 4663;

export const ROBINHOOD_RPC =
  (import.meta.env.VITE_ROBINHOOD_RPC_URL as string) ||
  "https://rpc.mainnet.chain.robinhood.com";

export const ROBINHOOD_EXPLORER = "https://robinhoodchain.blockscout.com";

/** $NURO ERC-20 on Robinhood Chain (override per-env with VITE_NURO_TOKEN). */
export const NURO_TOKEN = (
  (import.meta.env.VITE_NURO_TOKEN as string) ||
  "0x3bbe06f1fa1eee18dd4bc4092c79294a9a24e262"
).toLowerCase();

/** Same address but with its original (checksummed) casing — for display/copy. */
export const NURO_TOKEN_DISPLAY =
  (import.meta.env.VITE_NURO_TOKEN as string) ||
  "0x3BbE06f1Fa1eee18dd4Bc4092C79294a9A24E262";

export const NURO_SYMBOL = "NURO";

/** USDG (Global Dollar) ERC-20 on Robinhood Chain. */
export const USDG_TOKEN = (
  (import.meta.env.VITE_USDG_TOKEN as string) ||
  "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
).toLowerCase();

// ERC-20 function selectors (first 4 bytes of keccak256 of the signature).
const SELECTOR_BALANCE_OF = "0x70a08231"; // balanceOf(address)
const SELECTOR_DECIMALS = "0x313ce567"; // decimals()
const SELECTOR_TRANSFER = "0xa9059cbb"; // transfer(address,uint256)

function pad32(hexNo0x: string): string {
  return hexNo0x.toLowerCase().padStart(64, "0");
}

function encodeAddress(addr: string): string {
  return pad32(addr.replace(/^0x/, ""));
}

function encodeUint(value: bigint): string {
  return pad32(value.toString(16));
}

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export function shortAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function explorerAddressUrl(addr: string): string {
  return `${ROBINHOOD_EXPLORER}/address/${addr}`;
}

export function explorerTxUrl(hash: string): string {
  return `${ROBINHOOD_EXPLORER}/tx/${hash}`;
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

/** Raw on-chain balance (integer, in token base units). */
export async function getErc20Balance(
  token: string,
  owner: string,
): Promise<bigint> {
  const result = await ethCall(token, SELECTOR_BALANCE_OF + encodeAddress(owner));
  return BigInt(!result || result === "0x" ? "0x0" : result);
}

/** Token decimals; defaults to 18 if the call reverts or isn't implemented. */
export async function getErc20Decimals(token: string): Promise<number> {
  try {
    const result = await ethCall(token, SELECTOR_DECIMALS);
    if (!result || result === "0x") return 18;
    return Number(BigInt(result));
  } catch {
    return 18;
  }
}

/**
 * Strict decimals read for the payment path: throws instead of guessing, so we
 * can never miscompute an on-chain amount (e.g. treating a 6-decimal stablecoin
 * as 18 and charging 10^12x too much).
 */
export async function getErc20DecimalsStrict(token: string): Promise<number> {
  const result = await ethCall(token, SELECTOR_DECIMALS);
  if (!result || result === "0x") {
    throw new Error("Could not read token decimals");
  }
  const decimals = Number(BigInt(result));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("Token reported invalid decimals");
  }
  return decimals;
}

/** keccak256("Transfer(address,address,uint256)") — ERC-20 Transfer topic. */
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface TxLog {
  address: string;
  topics: string[];
  data: string;
}

export interface TxReceipt {
  status: string; // "0x1" success, "0x0" failed
  logs: TxLog[];
}

/** Fetch a transaction receipt; null if the tx isn't mined/visible yet. */
export async function getTransactionReceipt(
  hash: string,
): Promise<TxReceipt | null> {
  const res = await fetch(ROBINHOOD_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [hash],
    }),
  });
  const json = (await res.json()) as {
    result?: TxReceipt | null;
    error?: { message?: string };
  };
  if (json.error) throw new Error(json.error.message || "RPC call failed");
  return json.result ?? null;
}

/** Decode the 32-byte topic-encoded address (right-most 40 hex chars). */
export function addressFromTopic(topic: string): string {
  return "0x" + topic.slice(-40).toLowerCase();
}

/** Calldata for `transfer(to, amount)`. */
export function encodeErc20Transfer(to: string, amount: bigint): string {
  return SELECTOR_TRANSFER + encodeAddress(to) + encodeUint(amount);
}

/** Format a base-unit integer as a human string with thousands separators. */
export function formatUnits(
  raw: bigint,
  decimals: number,
  maxFractionDigits = 4,
): string {
  const negative = raw < 0n;
  const value = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;

  const wholeStr = whole
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  let fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFractionDigits)
    .replace(/0+$/, "");

  return `${negative ? "-" : ""}${wholeStr}${fractionStr ? `.${fractionStr}` : ""}`;
}

/** Parse a human amount string into a base-unit integer. Throws on garbage. */
export function parseUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === "" || trimmed === ".") {
    throw new Error("Enter a valid amount");
  }
  const [whole = "0", fraction = ""] = trimmed.split(".");
  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(`${whole || "0"}${paddedFraction}`);
}
