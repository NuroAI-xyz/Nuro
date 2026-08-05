import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Solana network config — everything env-driven so the RPC endpoint, the
 * treasury, and (later) the $NURO mint + staking program can be dropped in
 * without code changes.
 *
 * Fill these in `.env`:
 *   VITE_SOLANA_RPC_URL      — RPC endpoint (defaults to mainnet-beta public)
 *   VITE_SOLANA_TREASURY     — base58 wallet that receives credit payments
 *   VITE_USDC_MINT           — USDC SPL mint (defaults to mainnet USDC)
 *   VITE_NURO_MINT           — $NURO SPL mint (set at token launch)
 *   VITE_STAKING_PROGRAM     — staking program id (set once the program ships)
 */
const env = import.meta.env;

/** Public mainnet-beta RPC by default; override with a paid RPC in prod. */
export const SOLANA_RPC =
  (env.VITE_SOLANA_RPC_URL as string) || "https://api.mainnet-beta.solana.com";

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC, "confirmed");
}

/** Canonical mainnet USDC mint (6 decimals). */
export const USDC_MINT = new PublicKey(
  (env.VITE_USDC_MINT as string) ||
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);
export const USDC_DECIMALS = 6;

/** Base58 treasury owner that receives payments. Empty string = not set. */
export const TREASURY_ADDRESS = (env.VITE_SOLANA_TREASURY as string) ?? "";

export function treasuryPubkey(): PublicKey | null {
  if (!TREASURY_ADDRESS) return null;
  try {
    return new PublicKey(TREASURY_ADDRESS);
  } catch {
    return null;
  }
}

/** $NURO mint (set at launch) — used to flip on-token features. */
export const NURO_MINT = (env.VITE_NURO_MINT as string) ?? "";
export const NURO_CONFIGURED = !!NURO_MINT;

/** Staking program id — unset until the on-chain program is deployed. */
export const STAKING_PROGRAM = (env.VITE_STAKING_PROGRAM as string) ?? "";

/** Staking is "configured" (live) only once a program id is present. */
export const isConfigured = !!STAKING_PROGRAM && NURO_CONFIGURED;
