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
  explorerTxUrl,
  formatUnits,
  getErc20Balance,
  getErc20Decimals,
  getTransactionReceipt,
  parseUnits,
} from "../lib/token";
import {
  STAKING_CONFIGURED,
  buildApprove,
  buildClaim,
  buildCompound,
  buildStake,
  buildUnstake,
  getStakeAllowance,
  getStakePosition,
  type StakePosition,
  type TxRequest,
} from "../lib/staking";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stake $NURO - Nuro AI" },
    {
      name: "description",
      content:
        "Stake $NURO from self-custody and earn a share of real network revenue. Only you can unstake or claim - no server holds your funds.",
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
              · self-custody
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#8a8a8a] md:text-lg">
            Your $NURO stays in your own Robinhood Chain wallet. Only you can
            unstake or claim - no server holds your funds. Stakers earn a share
            of real network revenue from inference.
          </p>
        </Reveal>

        {STAKING_CONFIGURED ? <StakeCard /> : <PreviewCard />}
        <RevenueNote />
      </main>
      <SiteFooter />
    </div>
  );
}

// --- plain (comma-free) formatting for populating the amount input ---
function plainUnits(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

type Tab = "stake" | "unstake";
type Phase = "idle" | "approving" | "signing" | "confirming";

function StakeCard() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const wallet = getEmbeddedConnectedWallet(wallets) ?? wallets[0];
  const address = wallet?.address ?? null;

  const [decimals, setDecimals] = useState(18);
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [pos, setPos] = useState<StakePosition | null>(null);
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<Tab>("stake");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [dec, bal, allow, position] = await Promise.all([
        getErc20Decimals(NURO_TOKEN),
        getErc20Balance(NURO_TOKEN, address),
        getStakeAllowance(address),
        getStakePosition(address),
      ]);
      setDecimals(dec);
      setBalance(bal);
      setAllowance(allow);
      setPos(position);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staking data.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const busy = phase !== "idle";
  const now = Math.floor(Date.now() / 1000);
  const locked = pos ? Number(pos.unlockTime) > now : false;
  const staked = pos?.staked ?? 0n;
  const pending = pos?.pending ?? 0n;
  const canCompound = pos?.rewardIsStake ?? false;

  const max = tab === "stake" ? balance : staked;

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
      let value: bigint;
      try {
        value = parseUnits(amount, decimals);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Enter a valid amount");
      }
      if (value <= 0n) throw new Error("Enter an amount greater than zero");
      if (value > balance) throw new Error("Amount exceeds your $NURO balance");

      if (allowance < value) {
        setPhase("approving");
        await send(buildApprove());
      }
      setPhase("signing");
      await send(buildStake(value));
      setAmount("");
      setNotice("Staked successfully.");
    });

  const onUnstake = () =>
    withGuards(async () => {
      let value: bigint;
      try {
        value = parseUnits(amount, decimals);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Enter a valid amount");
      }
      if (value <= 0n) throw new Error("Enter an amount greater than zero");
      if (value > staked) throw new Error("Amount exceeds your staked balance");
      if (locked) throw new Error("Your stake is still within the unstake cooldown");
      setPhase("signing");
      await send(buildUnstake(value));
      setAmount("");
      setNotice("Unstaked successfully.");
    });

  const onClaim = () =>
    withGuards(async () => {
      if (pending <= 0n) throw new Error("Nothing to claim yet");
      setPhase("signing");
      await send(buildClaim());
      setNotice("Rewards claimed.");
    });

  const onCompound = () =>
    withGuards(async () => {
      if (pending <= 0n) throw new Error("Nothing to compound yet");
      setPhase("signing");
      await send(buildCompound());
      setNotice("Rewards compounded into your stake.");
    });

  const submit = tab === "stake" ? onStake : onUnstake;
  const cta =
    phase === "approving"
      ? "Approve in wallet…"
      : phase === "signing"
        ? "Confirm in wallet…"
        : phase === "confirming"
          ? "Confirming…"
          : !authenticated
            ? "Connect wallet to stake"
            : tab === "stake"
              ? "Stake $NURO"
              : "Unstake";

  return (
    <Reveal>
      <div className="glass-panel mt-12 grid gap-6 rounded-[1.75rem] p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
        {/* Left: action panel */}
        <div>
          <div className="inline-flex rounded-full border border-white/[0.08] bg-black/40 p-1">
            {(["stake", "unstake"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setAmount("");
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-full px-5 py-1.5 text-xs font-medium capitalize transition ${
                  tab === t
                    ? "bg-[#7ED6FF]/[0.14] text-[#D4F3FF]"
                    : "text-[#8a8a8a] hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
            <div className="flex items-center justify-between text-[12px] text-[#8a8a8a]">
              <span>{tab === "stake" ? "Wallet balance" : "Staked"}</span>
              <span>
                {formatUnits(max, decimals)} {NURO_SYMBOL}
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
                onClick={() => setAmount(plainUnits(max, decimals))}
                className="rounded-full border border-white/[0.12] px-3 py-1 text-[11px] font-medium text-[#D4F3FF] transition hover:border-[#7ED6FF]/50"
              >
                MAX
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || loading}
            className="btn-primary mt-4 w-full disabled:opacity-40"
          >
            {cta}
          </button>

          {tab === "unstake" && locked && (
            <p className="mt-2 text-center text-[12px] text-[#c9a24a]">
              Unstake unlocks at {new Date(Number(pos!.unlockTime) * 1000).toLocaleString()}.
            </p>
          )}
          {notice && (
            <p className="mt-3 text-center text-[13px] text-[#7ee6a6]">{notice}</p>
          )}
          {error && (
            <p className="mt-3 text-center text-[13px] text-[#ff9b9b]">{error}</p>
          )}
        </div>

        {/* Right: position + rewards */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="section-index text-[#7ED6FF]/70">Your position</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Staked">
              {formatUnits(staked, decimals)} {NURO_SYMBOL}
            </Row>
            <Row label="Claimable rewards">
              {formatUnits(pending, decimals)} {NURO_SYMBOL}
            </Row>
            <Row label="Pool total staked">
              {pos ? formatUnits(pos.totalStaked, decimals) : "—"} {NURO_SYMBOL}
            </Row>
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => void onClaim()}
              disabled={busy || loading || pending <= 0n}
              className="rounded-full border border-white/[0.12] px-4 py-2 text-xs font-medium text-white transition hover:border-[#7ED6FF]/50 disabled:opacity-30"
            >
              Claim
            </button>
            <button
              type="button"
              onClick={() => void onCompound()}
              disabled={busy || loading || pending <= 0n || !canCompound}
              className="rounded-full border border-white/[0.12] px-4 py-2 text-xs font-medium text-white transition hover:border-[#7ED6FF]/50 disabled:opacity-30"
            >
              Compound
            </button>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[#5c5c5c]">
            Rewards accrue as the treasury funds the pool in $NURO. Compound
            restakes rewards; claim withdraws them to your wallet. Settles on
            Robinhood Chain.
          </p>
          {notice && notice.startsWith("Submitted") && (
            <p className="mt-2 text-[11px] text-[#7ED6FF]">{notice}</p>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
      <dt className="text-[#8a8a8a]">{label}</dt>
      <dd className="font-medium text-[#D4F3FF]">{children}</dd>
    </div>
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
          The staking vault ships as an on-chain contract on Robinhood Chain,
          audited before launch. Once the $NURO token and staking contract are
          live, this page connects to your wallet automatically — stake, unstake
          anytime, claim $NURO rewards, or compound them back into your stake.
          Rewards are $NURO the treasury tops the pool up with over time, shared
          pro-rata across everyone staked.
        </p>
      </div>
    </Reveal>
  );
}

function RevenueNote() {
  const points = [
    {
      title: "Where yield comes from",
      body: "Every paid inference request is split on-chain: the majority to the GPU workers that served it, a treasury cut for privacy research, and a slice that funds this staking pool. The treasury tops the pool up in $NURO over time, so stakers earn $NURO.",
    },
    {
      title: "Paid for real work",
      body: "Worker payouts release only against a valid correctness/privacy receipt - the same receipt discipline that proves the network ran your job right.",
    },
    {
      title: "Self-custody, always",
      body: "Principal lives in a vault only your wallet can withdraw from. No admin key can move, seize, or slash your stake.",
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
            <p className="mt-3 text-[14px] leading-relaxed text-[#8a8a8a]">
              {p.body}
            </p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
