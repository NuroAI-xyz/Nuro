import { useState } from "react";
import {
  usePrivy,
  useWallets,
  useSendTransaction,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import {
  CREDIT_PACKS,
  PAYMENTS_CONFIGURED,
  PAYMENT_TOKENS,
  buildCreditTransfer,
  tokenAmountWhole,
  type CreditPack,
  type PayTokenId,
} from "../../lib/payments";
import type { Entitlements } from "../../lib/assistant";

type Phase = "idle" | "wallet" | "signing" | "confirming" | "done" | "error";

function priceLabel(token: PayTokenId, pack: CreditPack): string {
  const amount = tokenAmountWhole(token, pack);
  return token === "usdg"
    ? `${amount} USDG`
    : `${amount.toLocaleString()} $NURO`;
}

export function Paywall({
  open,
  onClose,
  entitlements,
  onCredited,
}: {
  open: boolean;
  onClose: () => void;
  entitlements: Entitlements;
  onCredited: (ent: Entitlements) => void;
}) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const wallet = getEmbeddedConnectedWallet(wallets) ?? wallets[0];

  const [pack, setPack] = useState<CreditPack>(
    CREDIT_PACKS.find((p) => p.highlight) ?? CREDIT_PACKS[0],
  );
  const [token, setToken] = useState<PayTokenId>("usdg");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const busy =
    phase === "wallet" || phase === "signing" || phase === "confirming";

  const pay = async () => {
    setError(null);
    if (!PAYMENTS_CONFIGURED) {
      setError("Payments aren't configured yet.");
      return;
    }
    if (!authenticated) {
      setPhase("wallet");
      try {
        await login();
      } finally {
        setPhase("idle");
      }
      return;
    }
    if (!wallet) {
      setError("No wallet found. Log out and back in to create one.");
      return;
    }

    try {
      setPhase("signing");
      const transfer = await buildCreditTransfer(token, pack);
      const { hash } = await sendTransaction(
        {
          to: transfer.to,
          data: transfer.data,
          chainId: transfer.chainId,
        },
        { address: wallet.address },
      );

      // Poll the server verifier until the tx is confirmed on-chain (it returns
      // 404 while the receipt isn't visible yet).
      setPhase("confirming");
      const deadline = Date.now() + 120_000;
      for (;;) {
        const res = await fetch("/api/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash: hash, packId: pack.id, token }),
        });
        const data = (await res.json()) as {
          error?: string;
          entitlements?: Entitlements;
        };
        if (res.ok && data.entitlements) {
          onCredited(data.entitlements);
          setPhase("done");
          return;
        }
        if (res.status === 404 && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        throw new Error(data.error || "Could not verify the payment.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed.";
      setError(
        /reject|denied|cancell?ed/i.test(msg) ? "Payment cancelled." : msg,
      );
      setPhase("error");
    }
  };

  const cta =
    phase === "wallet"
      ? "Connect wallet…"
      : phase === "signing"
        ? "Confirm in wallet…"
        : phase === "confirming"
          ? "Confirming payment…"
          : !authenticated
            ? "Sign in to pay"
            : `Pay ${priceLabel(token, pack)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-panel w-full max-w-md rounded-[1.75rem] border border-white/[0.1] bg-black/90 p-6 md:p-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="label-caps">Out of free messages</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
              Top up to keep chatting
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#8a8a8a] transition hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-[#8a8a8a]">
          You've used {entitlements.freeUsed}/{entitlements.freeLimit} free
          messages. Credits power the in-app assistant — pay with USDG or $NURO
          on Robinhood Chain.
        </p>

        {/* Packs */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {CREDIT_PACKS.map((p) => {
            const active = p.id === pack.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPack(p)}
                className={`relative rounded-2xl border px-3 py-4 text-center transition ${
                  active
                    ? "border-[#7ED6FF]/60 bg-[#7ED6FF]/[0.08]"
                    : "border-white/[0.08] bg-black/40 hover:border-white/20"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#7ED6FF] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black">
                    Popular
                  </span>
                )}
                <div className="text-lg font-semibold text-white">
                  {p.credits}
                </div>
                <div className="text-[11px] text-[#8a8a8a]">messages</div>
                <div className="mt-2 text-sm font-medium text-[#D4F3FF]">
                  {priceLabel(token, p)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Token toggle */}
        <div className="mt-4 inline-flex rounded-full border border-white/[0.08] bg-black/40 p-1">
          {(Object.keys(PAYMENT_TOKENS) as PayTokenId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setToken(id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                token === id
                  ? "bg-[#7ED6FF]/[0.14] text-[#D4F3FF]"
                  : "text-[#8a8a8a] hover:text-white"
              }`}
            >
              {PAYMENT_TOKENS[id].symbol}
            </button>
          ))}
        </div>

        {/* Pay */}
        <button
          type="button"
          onClick={() => void pay()}
          disabled={busy || !PAYMENTS_CONFIGURED}
          className="btn-primary mt-5 w-full disabled:opacity-40"
        >
          {cta}
        </button>

        {!PAYMENTS_CONFIGURED && (
          <p className="mt-2 text-center text-[12px] text-[#c9a24a]">
            Checkout activates once the treasury address is configured.
          </p>
        )}

        {phase === "done" && (
          <p className="mt-3 text-center text-[13px] text-[#7ee6a6]">
            Payment confirmed — {pack.credits} messages added. Happy chatting!
          </p>
        )}
        {error && (
          <p className="mt-3 text-center text-[13px] text-[#ff9b9b]">{error}</p>
        )}

        <p className="mt-4 text-center text-[11px] text-[#5c5c5c]">
          Payment settles on Robinhood Chain to the Nuro treasury. Credits are
          granted after the payment is verified on-chain.
        </p>
      </div>
    </div>
  );
}
