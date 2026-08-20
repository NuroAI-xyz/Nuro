/**
 * Grant assistant credits after a confirmed on-chain payment on Robinhood Chain.
 *
 * The client submits `{ txHash, packId, token }` once its ERC-20 transfer
 * (USDG or $NURO) is sent. This route fetches the transaction receipt, verifies
 * it (a) succeeded and (b) moved at least the required amount of the given token
 * into the Nuro treasury — by scanning the `Transfer` logs — then credits the
 * (signed cookie) balance exactly once (tx hashes are recorded to block replay).
 *
 * Credits are therefore only ever minted by a real, verified payment; the
 * client cannot fabricate a balance.
 */
import type { ActionFunctionArgs } from "react-router";
import {
  alreadyRedeemed,
  cookieHeader,
  getState,
  grantCredits,
  view,
} from "../lib/entitlements.server";
import {
  PAYMENTS_CONFIGURED,
  TREASURY_ADDRESS,
  packById,
  paymentToken,
  requiredBaseUnits,
  tokenAmountWhole,
  type PayTokenId,
} from "../lib/payments";
import {
  TRANSFER_TOPIC,
  addressFromTopic,
  getErc20DecimalsStrict,
  getTransactionReceipt,
} from "../lib/token";

function err(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return err(405, "Method not allowed");
  if (!PAYMENTS_CONFIGURED)
    return err(
      501,
      "Payments are not configured on the server (set VITE_ROBINHOOD_TREASURY).",
    );

  let body: { txHash?: string; packId?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return err(400, "Invalid request body.");
  }

  const txHash = String(body.txHash || "");
  const pack = packById(String(body.packId || ""));
  const tokenId = String(body.token || "") as PayTokenId;

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash))
    return err(400, "Invalid transaction hash.");
  if (!pack) return err(400, "Unknown credit pack.");
  if (tokenId !== "usdg" && tokenId !== "nuro")
    return err(400, "Unknown payment token.");

  const state = getState(request);
  if (alreadyRedeemed(state, txHash))
    return err(409, "This payment has already been credited.");

  const token = paymentToken(tokenId);

  let receipt;
  try {
    receipt = await getTransactionReceipt(txHash);
  } catch {
    return err(502, "The Nuro network is unreachable right now.");
  }

  // Not mined / visible yet — client keeps polling.
  if (!receipt)
    return err(
      404,
      "Transaction not found yet. Wait for it to confirm and try again.",
    );
  if (receipt.status !== "0x1") return err(400, "Transaction failed on-chain.");

  // Sum every Transfer of this token into the treasury within the tx.
  let received = 0n;
  for (const log of receipt.logs ?? []) {
    if (log.address?.toLowerCase() !== token.address) continue;
    if (!log.topics || log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;
    if (addressFromTopic(log.topics[2]) !== TREASURY_ADDRESS) continue;
    received += BigInt(!log.data || log.data === "0x" ? "0x0" : log.data);
  }

  let decimals: number;
  try {
    decimals = await getErc20DecimalsStrict(token.address);
  } catch {
    return err(502, "Couldn't verify the payment token right now.");
  }

  const required = requiredBaseUnits(tokenId, pack, decimals);
  if (received < required)
    return err(
      400,
      `Payment is below the ${tokenAmountWhole(tokenId, pack)} ${
        token.symbol
      } pack price.`,
    );

  // Verified — grant credits exactly once.
  const next = grantCredits(state, pack.credits, txHash);
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
