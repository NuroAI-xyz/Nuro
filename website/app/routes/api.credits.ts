/**
 * Grant assistant credits after a confirmed on-chain USDC payment on Solana.
 *
 * The client submits `{ signature, packId }` once its USDC transfer is sent.
 * This route re-derives the required amount from the pack, fetches the parsed
 * transaction, and verifies that it (a) confirmed without error and (b) moved
 * at least the required amount of USDC into the Nuro treasury's token account —
 * then credits the (signed cookie) balance exactly once (signatures are
 * recorded to block replay).
 *
 * Credits are therefore only ever minted by a real, verified payment; the
 * client cannot fabricate a balance.
 */
import type { ActionFunctionArgs } from "react-router";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  alreadyRedeemed,
  cookieHeader,
  getState,
  grantCredits,
  view,
} from "../lib/entitlements.server";

const PACKS: Record<string, { credits: number; usd: number }> = {
  starter: { credits: 100, usd: 5 },
  plus: { credits: 250, usd: 10 },
  pro: { credits: 750, usd: 25 },
};

const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.VITE_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";
const USDC_MINT =
  process.env.VITE_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TREASURY = process.env.VITE_SOLANA_TREASURY || "";
const USDC_DECIMALS = 6;

function err(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Total USDC (base units) credited to the treasury owner in this tx. */
function usdcToTreasury(
  pre: readonly TokenBalance[],
  post: readonly TokenBalance[],
  treasury: string,
): bigint {
  const key = (b: TokenBalance) => b.accountIndex;
  const preByIdx = new Map<number, bigint>();
  for (const b of pre) {
    if (b.owner === treasury && b.mint === USDC_MINT)
      preByIdx.set(key(b), BigInt(b.uiTokenAmount.amount));
  }
  let delta = 0n;
  for (const b of post) {
    if (b.owner === treasury && b.mint === USDC_MINT) {
      const before = preByIdx.get(key(b)) ?? 0n;
      delta += BigInt(b.uiTokenAmount.amount) - before;
    }
  }
  return delta;
}

interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return err(405, "Method not allowed");
  if (!TREASURY)
    return err(
      501,
      "Payments are not configured on the server (set VITE_SOLANA_TREASURY).",
    );

  let body: { signature?: string; packId?: string };
  try {
    body = await request.json();
  } catch {
    return err(400, "Invalid request body.");
  }

  const signature = String(body.signature || "");
  const pack = PACKS[String(body.packId || "")];
  if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature))
    return err(400, "Invalid transaction signature.");
  if (!pack) return err(400, "Unknown credit pack.");

  const state = getState(request);
  if (alreadyRedeemed(state, signature))
    return err(409, "This payment has already been credited.");

  // sanity-check configured pubkeys
  try {
    new PublicKey(TREASURY);
    new PublicKey(USDC_MINT);
  } catch {
    return err(500, "Server payment config is invalid.");
  }

  const connection = new Connection(RPC_URL, "confirmed");

  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  // Not visible on-chain yet — client keeps polling.
  if (!tx || !tx.meta)
    return err(
      404,
      "Transaction not found yet. Wait for it to confirm and try again.",
    );
  if (tx.meta.err) return err(400, "Transaction failed on-chain.");

  const credited = usdcToTreasury(
    (tx.meta.preTokenBalances ?? []) as TokenBalance[],
    (tx.meta.postTokenBalances ?? []) as TokenBalance[],
    TREASURY,
  );

  const required = BigInt(Math.round(pack.usd * 10 ** USDC_DECIMALS));
  if (credited < required)
    return err(
      400,
      `Payment is below the ${pack.usd} USDC pack price (received ${
        Number(credited) / 10 ** USDC_DECIMALS
      } USDC).`,
    );

  // Verified — grant credits exactly once.
  const next = grantCredits(state, pack.credits, signature);
  return new Response(
    JSON.stringify({ ok: true, granted: pack.credits, entitlements: view(next) }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieHeader(next),
      },
    },
  );
}
