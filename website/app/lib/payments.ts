/**
 * Buying assistant credits with on-chain assets on Solana.
 *
 * Today: USDC — a plain SPL token transfer to the Nuro treasury. The transfer
 * is signed by the user's connected Solana wallet; the server then verifies the
 * transaction on-chain (`/api/credits`) before granting credits, so credits can
 * only be minted by a real, confirmed payment.
 *
 * Soon: $NURO — enabled automatically once the token mint is set via
 * `VITE_NURO_MINT` (same env-driven pattern as the rest of the app).
 *
 * Everything money-related is env-driven and the buy button stays disabled
 * until a treasury recipient is configured, so nothing can be sent to a
 * placeholder address.
 */
import {
  PublicKey,
  Transaction,
  type Connection,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  NURO_CONFIGURED,
  TREASURY_ADDRESS,
  USDC_DECIMALS,
  USDC_MINT,
  treasuryPubkey,
} from "./chain";

/** USDC settles credit purchases; treasury must be set for checkout to open. */
export const USDC_CONFIGURED = !!treasuryPubkey();

/** $NURO becomes payable the moment the mint address is dropped in env. */
export { NURO_CONFIGURED };

export interface CreditPack {
  id: string;
  /** number of assistant messages this pack grants. */
  credits: number;
  /** price in USDC (whole dollars). */
  usd: number;
  label: string;
  highlight?: boolean;
}

/** Default packs (adjust freely — the server re-derives the required amount
 * from `usd`, so these stay the single source of truth). */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 100, usd: 5, label: "Starter" },
  { id: "plus", credits: 250, usd: 10, label: "Plus", highlight: true },
  { id: "pro", credits: 750, usd: 25, label: "Pro" },
];

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** Base-units for a USDC amount in whole dollars (USDC = 6 decimals). */
export function usdcAmount(usd: number): bigint {
  return BigInt(Math.round(usd * 10 ** USDC_DECIMALS));
}

/**
 * Build an unsigned USDC transfer to the treasury, serialized for Privy's
 * `signAndSendTransaction`. Creates the treasury's associated token account
 * idempotently so the first-ever payment can't fail on a missing ATA.
 */
export async function buildUsdcTransfer(
  connection: Connection,
  payer: PublicKey,
  pack: CreditPack,
): Promise<Uint8Array> {
  const treasury = treasuryPubkey();
  if (!treasury) throw new Error("Treasury is not configured.");

  const fromAta = await getAssociatedTokenAddress(USDC_MINT, payer);
  const toAta = await getAssociatedTokenAddress(USDC_MINT, treasury);

  const tx = new Transaction();
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      toAta,
      treasury,
      USDC_MINT,
    ),
  );
  tx.add(
    createTransferCheckedInstruction(
      fromAta,
      USDC_MINT,
      toAta,
      payer,
      usdcAmount(pack.usd),
      USDC_DECIMALS,
    ),
  );

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
}

export { TREASURY_ADDRESS };
