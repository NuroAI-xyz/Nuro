/**
 * Buying assistant credits with on-chain assets on Robinhood Chain (EVM).
 *
 * Two payment tokens, both plain ERC-20 transfers to the Nuro treasury:
 *   - USDG  — 1:1 USD stablecoin, so a pack's dollar price is the USDG amount.
 *   - $NURO — priced off `VITE_NURO_PRICE_USD` (USD per $NURO), so the same pack
 *             costs the equivalent in $NURO.
 *
 * The transfer is signed by the user's embedded EVM wallet; the server then
 * re-verifies the transaction on-chain (`/api/credits`) before granting credits,
 * so credits can only ever be minted by a real, confirmed payment. Everything is
 * env-driven and checkout stays disabled until a treasury recipient is set, so
 * nothing can be sent to a placeholder address.
 *
 * This module is the single source of truth for prices/amounts — both the client
 * (builds the transfer) and the server (verifies it) import from here so the
 * required amount can never drift between the two.
 */
import {
  NURO_TOKEN,
  ROBINHOOD_CHAIN_ID,
  USDG_TOKEN,
  encodeErc20Transfer,
  getErc20DecimalsStrict,
  isAddress,
  parseUnits,
} from "./token";

/** Treasury wallet (EVM) that receives credit payments. Empty = checkout off. */
export const TREASURY_ADDRESS = (
  (import.meta.env.VITE_ROBINHOOD_TREASURY as string) || ""
).toLowerCase();

/** Checkout only opens once a valid treasury recipient is configured. */
export const PAYMENTS_CONFIGURED = isAddress(TREASURY_ADDRESS);

/** Price of one $NURO in USD — used to convert a pack's USD price to $NURO. */
export const NURO_PRICE_USD =
  Number(import.meta.env.VITE_NURO_PRICE_USD ?? "0.001") || 0.001;

export type PayTokenId = "usdg" | "nuro";

export interface PaymentToken {
  id: PayTokenId;
  symbol: string;
  address: string;
}

export const PAYMENT_TOKENS: Record<PayTokenId, PaymentToken> = {
  usdg: { id: "usdg", symbol: "USDG", address: USDG_TOKEN },
  nuro: { id: "nuro", symbol: "$NURO", address: NURO_TOKEN },
};

export function paymentToken(id: PayTokenId): PaymentToken {
  return PAYMENT_TOKENS[id];
}

export interface CreditPack {
  id: string;
  /** number of assistant messages this pack grants. */
  credits: number;
  /** price in USD (whole dollars) — the USDG amount, and the basis for $NURO. */
  usd: number;
  label: string;
  highlight?: boolean;
}

/** Default packs (the server re-derives the required amount from `usd`, so
 * these stay the single source of truth). */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 100, usd: 5, label: "Starter" },
  { id: "plus", credits: 250, usd: 10, label: "Plus", highlight: true },
  { id: "pro", credits: 750, usd: 25, label: "Pro" },
];

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/**
 * Whole-token amount charged for `pack` in `token`. USDG is 1:1 with the USD
 * price; $NURO is the USD price converted at `NURO_PRICE_USD` (rounded to a
 * whole token so amounts stay clean).
 */
export function tokenAmountWhole(token: PayTokenId, pack: CreditPack): number {
  if (token === "usdg") return pack.usd;
  return Math.max(1, Math.round(pack.usd / NURO_PRICE_USD));
}

/** Base-unit amount required for `pack` in `token`, given the token's decimals. */
export function requiredBaseUnits(
  token: PayTokenId,
  pack: CreditPack,
  decimals: number,
): bigint {
  return parseUnits(String(tokenAmountWhole(token, pack)), decimals);
}

export interface CreditTransfer {
  to: string; // token contract
  data: string; // transfer(treasury, amount)
  chainId: number;
}

/**
 * Build the ERC-20 transfer for a credit purchase. Reads the token's decimals
 * strictly (throws rather than guessing) so the amount is always exact.
 */
export async function buildCreditTransfer(
  token: PayTokenId,
  pack: CreditPack,
): Promise<CreditTransfer> {
  if (!PAYMENTS_CONFIGURED) throw new Error("Payments are not configured.");
  const t = PAYMENT_TOKENS[token];
  const decimals = await getErc20DecimalsStrict(t.address);
  const amount = requiredBaseUnits(token, pack, decimals);
  return {
    to: t.address,
    data: encodeErc20Transfer(TREASURY_ADDRESS, amount),
    chainId: ROBINHOOD_CHAIN_ID,
  };
}
