import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../../lib/chain";
import {
  buildUsdcTransfer,
  CREDIT_PACKS,
  NURO_CONFIGURED,
  USDC_CONFIGURED,
  type CreditPack,
} from "../../lib/payments";
import type { Entitlements } from "../../lib/assistant";

type Phase =
  | "idle"
  | "wallet"
  | "signing"
  | "confirming"
  | "verifying"
  | "done"
  | "error";

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
  const { authenticated, login, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const wallet = wallets[0];

  const [pack, setPack] = useState<CreditPack>(
    CREDIT_PACKS.find((p) => p.highlight) ?? CREDIT_PACKS[0],
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const busy =
    phase === "wallet" ||
    phase === "signing" ||
    phase === "confirming" ||
    phase === "verifying";

  const payWithUsdc = async () => {
    setError(null);
    if (!USDC_CONFIGURED) {
      setError("USDC payments aren't configured yet.");
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
      // Signed in (e.g. via email) but no Solana wallet attached yet.
      setPhase("wallet");
      try {
        await connectWallet();
      } finally {
        setPhase("idle");
      }
      return;
    }
    try {
      setPhase("signing");
      const connection = getConnection();
      const payer = new PublicKey(wallet.address);
      const transaction = await buildUsdcTransfer(connection, payer, pack);

      const { signature } = await signAndSendTransaction({
        transaction,
        wallet,
        chain: "solana:mainnet",
      });

      // Poll the server verifier until the tx is confirmed on-chain (it returns
      // 404 while the signature isn't visible / finalized yet).
      setPhase("confirming");
      const deadline = Date.now() + 120_000;
      for (;;) {
        const res = await fetch("/api/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature, packId: pack.id }),
        });
        const body = (await res.json()) as {
          error?: string;
          entitlements?: Entitlements;
        };
        if (res.ok && body.entitlements) {
          onCredited(body.entitlements);
          setPhase("done");
          return;
        }
        if (res.status === 404 && Date.now() < deadline) {
          setPhase("verifying");
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        throw new Error(body.error || "Could not verify the payment.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed.";
      // Wallet rejections shouldn't read like errors.
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
          ? "Waiting for confirmation…"
          : phase === "verifying"
            ? "Verifying payment…"
            : !authenticated
              ? "Sign in to pay"
              : !wallet
                ? "Connect a wallet"
                : `Pay ${pack.usd} USDC`;

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
          messages. Credits power the in-app assistant — buy a pack with USDC.
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
                  {p.usd} USDC
                </div>
              </button>
            );
          })}
        </div>

        {/* USDC pay */}
        <button
          type="button"
          onClick={() => void payWithUsdc()}
          disabled={busy || !USDC_CONFIGURED}
          className="btn-primary mt-5 w-full disabled:opacity-40"
        >
          {cta}
        </button>

        {!USDC_CONFIGURED && (
          <p className="mt-2 text-center text-[12px] text-[#c9a24a]">
            USDC checkout activates once the treasury address is configured.
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

        {/* $NURO */}
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Pay with $NURO</p>
              <p className="text-[12px] text-[#8a8a8a]">
                {NURO_CONFIGURED
                  ? "Use $NURO for discounted credits."
                  : "Available at token launch."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                NURO_CONFIGURED
                  ? "bg-[#7ED6FF]/[0.12] text-[#7ED6FF]"
                  : "bg-white/[0.06] text-[#8a8a8a]"
              }`}
            >
              {NURO_CONFIGURED ? "Available" : "Coming soon"}
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#5c5c5c]">
          USDC settles on Solana to the Nuro treasury. Credits are granted after
          the payment is verified.
        </p>
      </div>
    </div>
  );
}
