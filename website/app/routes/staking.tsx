import { useCallback, useEffect, useState } from "react";
import {
  usePrivy,
  useWallets,
  useSendTransaction,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import type { Route } from "./+types/staking";
import { SiteFooter, SiteHeader } from "../components/layout/site-chrome";
import { Reveal } from "../components/util/reveal";
import {
  NURO_SYMBOL,
  NURO_TOKEN,
  explorerAddressUrl,
  formatUnits,
  getErc20Balance,
  getErc20Decimals,
  getTransactionReceipt,
  parseUnits,
  shortAddress,
} from "../lib/token";
import {
  STAKING_APY_PCT,
  STAKING_CONFIGURED,
  TERM_LABEL,
  TERM_SECONDS,
  Term,
  buildApprove,
  buildEmergencyWithdraw,
  buildStake,
  buildWithdraw,
  effectiveRatePct,
  getStakeAllowance,
  getStakingSummary,
  type Position,
  type StakingSummary,
  type TxRequest,
} from "../lib/staking";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stake $NURO - Nuro AI" },
    {
      name: "description",
      content: `Lock $NURO for 6 months or 1 year and earn ${STAKING_APY_PCT}% APY, paid at maturity. Self-custody — only you can withdraw.`,
    },
  ];
}

export default function StakingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative pt-20 pb-24 md:pt-28">
        <Reveal>
          <p className="label-caps">Private inference economy</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            Stake <span className="text-gradient">$NURO</span>
            <span className="ml-3 align-middle text-base font-normal text-[#6f6f6f]">
              · {STAKING_APY_PCT}% APY
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#8a8a8a] md:text-lg">
            Lock $NURO for a fixed term and earn {STAKING_APY_PCT}% APY, paid in
            full at maturity. Your $NURO stays self-custodied on Robinhood Chain —
            only you can withdraw, and your reward is reserved on-chain the moment
            you stake.
          </p>
        </Reveal>

        {STAKING_CONFIGURED ? <StakeCard /> : <PreviewCard />}
        <RevenueNote />
      </main>
      <SiteFooter />
    </div>
  );
}

// plain (comma-free) formatting for populating the amount input.
function plainUnits(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

const YEAR_SECONDS = 365 * 24 * 60 * 60;

// Client-side mirror of the contract's integer reward math.
function quoteRewardLocal(amount: bigint, term: Term, apyBps: number): bigint {
  return (
    (amount * BigInt(apyBps) * BigInt(TERM_SECONDS[term])) /
    (BigInt(YEAR_SECONDS) * 10_000n)
  );
}

type Phase = "idle" | "approving" | "signing";

function StakeCard() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const wallet = getEmbeddedConnectedWallet(wallets) ?? wallets[0];
  const address = wallet?.address ?? null;

  const [decimals, setDecimals] = useState(18);
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [summary, setSummary] = useState<StakingSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [term, setTerm] = useState<Term>(Term.OneYear);
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    // Read each piece independently so one failing call (e.g. a positions
    // decode) can never blank out an otherwise-good balance/allowance read.
    const [dec, bal, allow, sum] = await Promise.allSettled([
      getErc20Decimals(NURO_TOKEN),
      getErc20Balance(NURO_TOKEN, address),
      getStakeAllowance(address),
      getStakingSummary(address),
    ]);
    if (dec.status === "fulfilled") setDecimals(dec.value);
    if (bal.status === "fulfilled") setBalance(bal.value);
    if (allow.status === "fulfilled") setAllowance(allow.value);
    if (sum.status === "fulfilled") setSummary(sum.value);
    setLoading(false);
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const busy = phase !== "idle";
  const APY_BPS = Math.round(STAKING_APY_PCT * 100);

  let parsed: bigint | null = null;
  try {
    parsed = amount.trim() ? parseUnits(amount, decimals) : null;
  } catch {
    parsed = null;
  }
  const projectedReward =
    parsed && parsed > 0n ? quoteRewardLocal(parsed, term, APY_BPS) : 0n;
  const poolCapacityReached =
    summary != null && projectedReward > summary.availableRewards;

  const waitReceipt = async (hash: string) => {
    const deadline = Date.now() + 120_000;
    for (;;) {
      const receipt = await getTransactionReceipt(hash);
      if (receipt) {
        if (receipt.status !== "0x1") throw new Error("Transaction reverted on-chain.");
        return;
      }
      if (Date.now() > deadline) throw new Error("Timed out waiting for confirmation.");
      await new Promise((r) => setTimeout(r, 3000));
    }
  };

  const send = async (tx: TxRequest) => {
    const { hash } = await sendTransaction(
      { to: tx.to, data: tx.data, chainId: tx.chainId },
      { address: wallet!.address },
    );
    setNotice(`Submitted · ${hash.slice(0, 10)}…`);
    await waitReceipt(hash);
    return hash;
  };

  const withGuards = async (fn: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    if (!authenticated) {
      try {
        setPhase("signing");
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
      await fn();
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      setError(/reject|denied|cancell?ed/i.test(msg) ? "Transaction cancelled." : msg);
    } finally {
      setPhase("idle");
    }
  };

  const onStake = () =>
    withGuards(async () => {
      if (!parsed || parsed <= 0n) throw new Error("Enter an amount greater than zero");
      if (parsed > balance) throw new Error("Amount exceeds your $NURO balance");
      if (poolCapacityReached)
        throw new Error("Reward pool is at capacity — try a smaller amount or shorter term");

      if (allowance < parsed) {
        setPhase("approving");
        await send(buildApprove());
      }
      setPhase("signing");
      await send(buildStake(parsed, term));
      setAmount("");
      setNotice(`Locked ${TERM_LABEL[term]} — reward reserved and paid at maturity.`);
    });

  const onWithdraw = (id: number) =>
    withGuards(async () => {
      setPhase("signing");
      await send(buildWithdraw(id));
      setNotice("Withdrawn — principal + reward sent to your wallet.");
    });

  const onEmergency = (id: number) =>
    withGuards(async () => {
      setPhase("signing");
      await send(buildEmergencyWithdraw(id));
      setNotice("Exited early — principal returned, reward forfeited.");
    });

  const cta =
    phase === "approving"
      ? "Approve in wallet…"
      : phase === "signing"
        ? "Confirm in wallet…"
        : !authenticated
          ? "Connect wallet to stake"
          : `Lock for ${TERM_LABEL[term]}`;

  const positions = (summary?.positions ?? []).filter((p) => !p.withdrawn);

  return (
    <Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        {/* Left: stake panel */}
        <div className="glass-panel rounded-[1.75rem] p-6 md:p-8">
          <div className="flex items-center justify-between">
            <p className="section-index text-[#7ED6FF]/70">Lock & earn</p>
            {authenticated && address && (
              <a
                href={explorerAddressUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8a8a8a] transition hover:text-[#D4F3FF]"
                title="Your in-app wallet — fund this address with $NURO to stake"
              >
                Wallet {shortAddress(address)} ↗
              </a>
            )}
          </div>

          {/* Term selector */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[Term.SixMonths, Term.OneYear].map((t) => {
              const active = term === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-[#7ED6FF]/60 bg-[#7ED6FF]/[0.08]"
                      : "border-white/[0.08] bg-black/40 hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{TERM_LABEL[t]}</div>
                  <div className="mt-1 text-[11px] text-[#8a8a8a]">
                    {STAKING_APY_PCT}% APY · earns {effectiveRatePct(t).toFixed(2)}% of stake
                  </div>
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
            <div className="flex items-center justify-between text-[12px] text-[#8a8a8a]">
              <span>Amount to lock</span>
              <span>
                Balance: {formatUnits(balance, decimals)} {NURO_SYMBOL}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-semibold tracking-[-0.02em] text-white outline-none placeholder:text-[#4a4a4a]"
              />
              <button
                type="button"
                onClick={() => setAmount(plainUnits(balance, decimals))}
                className="rounded-full border border-white/[0.12] px-3 py-1 text-[11px] font-medium text-[#D4F3FF] transition hover:border-[#7ED6FF]/50"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Projection */}
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-[#8a8a8a]">You’ll receive at maturity</span>
            <span className="font-medium text-[#D4F3FF]">
              {parsed ? formatUnits(parsed + projectedReward, decimals) : "0"} {NURO_SYMBOL}
              <span className="ml-2 text-[12px] text-[#7ee6a6]">
                +{formatUnits(projectedReward, decimals)} reward
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => void onStake()}
            disabled={busy || loading}
            className="btn-primary mt-4 w-full disabled:opacity-40"
          >
            {cta}
          </button>

          {poolCapacityReached && (
            <p className="mt-2 text-center text-[12px] text-[#c9a24a]">
              Reward pool capacity reached for this amount — try less or a shorter term.
            </p>
          )}
          {notice && <p className="mt-3 text-center text-[13px] text-[#7ee6a6]">{notice}</p>}
          {error && <p className="mt-3 text-center text-[13px] text-[#ff9b9b]">{error}</p>}

          <p className="mt-4 text-[11px] leading-relaxed text-[#5c5c5c]">
            Your reward is fixed and reserved on-chain when you stake, then paid
            with your principal at maturity. Need out early? Emergency exit returns
            your principal (reward is forfeited). Settles on Robinhood Chain.
          </p>
        </div>

        {/* Right: positions */}
        <div className="glass-panel rounded-[1.75rem] p-6 md:p-8">
          <div className="flex items-center justify-between">
            <p className="section-index text-[#7ED6FF]/70">Your stakes</p>
            {summary && (
              <span className="text-[11px] text-[#5c5c5c]">
                Pool capacity: {formatUnits(summary.availableRewards, decimals)} {NURO_SYMBOL}
              </span>
            )}
          </div>

          {!authenticated ? (
            <p className="mt-6 text-[14px] text-[#8a8a8a]">
              Connect your wallet to see your locked positions.
            </p>
          ) : positions.length === 0 ? (
            <p className="mt-6 text-[14px] text-[#8a8a8a]">
              {loading ? "Loading positions…" : "No active stakes yet. Lock some $NURO to start earning."}
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {positions.map((p) => (
                <PositionRow
                  key={p.id}
                  p={p}
                  decimals={decimals}
                  busy={busy}
                  onWithdraw={() => void onWithdraw(p.id)}
                  onEmergency={() => void onEmergency(p.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function PositionRow({
  p,
  decimals,
  busy,
  onWithdraw,
  onEmergency,
}: {
  p: Position;
  decimals: number;
  busy: boolean;
  onWithdraw: () => void;
  onEmergency: () => void;
}) {
  const unlock = new Date(p.unlockAt * 1000);
  return (
    <li className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-semibold text-white">
            {formatUnits(p.amount, decimals)} {NURO_SYMBOL}
          </div>
          <div className="mt-1 text-[12px] text-[#7ee6a6]">
            +{formatUnits(p.reward, decimals)} {NURO_SYMBOL} reward
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            p.matured
              ? "bg-[#7ee6a6]/[0.14] text-[#7ee6a6]"
              : "bg-white/[0.06] text-[#8a8a8a]"
          }`}
        >
          {p.matured ? "Matured" : "Locked"}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-[#8a8a8a]">
          {p.matured ? "Unlocked" : `Unlocks ${unlock.toLocaleDateString()}`}
        </span>
        {p.matured ? (
          <button
            type="button"
            onClick={onWithdraw}
            disabled={busy}
            className="btn-primary px-4 py-1.5 text-xs disabled:opacity-40"
          >
            Withdraw + reward
          </button>
        ) : (
          <button
            type="button"
            onClick={onEmergency}
            disabled={busy}
            className="rounded-full border border-white/[0.12] px-4 py-1.5 text-xs font-medium text-[#ff9b9b] transition hover:border-[#ff9b9b]/50 disabled:opacity-40"
          >
            Emergency exit
          </button>
        )}
      </div>
    </li>
  );
}

function PreviewCard() {
  return (
    <Reveal>
      <div className="glass-panel mt-12 rounded-[1.75rem] p-8 md:p-10">
        <p className="section-index text-[#7ED6FF]/70">Coming online</p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] md:text-2xl">
          Staking activates when $NURO launches on Robinhood Chain
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#8a8a8a]">
          Lock $NURO for 6 months or 1 year and earn a fixed {STAKING_APY_PCT}%
          APY, paid at maturity. Once the staking contract is live, this page
          connects to your wallet automatically — self-custodied, with your reward
          reserved on-chain the moment you stake.
        </p>
      </div>
    </Reveal>
  );
}

function RevenueNote() {
  const points = [
    {
      title: "Fixed, reserved rewards",
      body: `Lock for 6 months or 1 year at ${STAKING_APY_PCT}% APY. Your exact reward is calculated and reserved on-chain the moment you stake, so it can never be diluted by later stakers — and it's paid in full with your principal at maturity.`,
    },
    {
      title: "Self-custody, always",
      body: "Principal and your reserved reward live in a vault only your wallet can withdraw from. No admin key can move, seize, or slash them; the owner can only reclaim the unreserved reward surplus.",
    },
    {
      title: "Exit anytime",
      body: "Locking is about the yield, not trapping funds. Emergency exit returns your principal before maturity — you simply forfeit that position's reward back into the pool.",
    },
  ];
  return (
    <div className="mt-16 grid gap-4 md:grid-cols-3">
      {points.map((p, i) => (
        <Reveal
          key={p.title}
          delay={i * 90}
          variant={i === 0 ? "left" : i === 2 ? "right" : "up"}
        >
          <article className="card glass-panel h-full rounded-[1.5rem] p-7">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-[#D4F3FF]">
              {p.title}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[#8a8a8a]">{p.body}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
