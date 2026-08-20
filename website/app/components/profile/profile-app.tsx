import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usePrivy,
  useWallets,
  useSendTransaction,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import { SiteFooter, SiteHeader } from "../layout/site-chrome";
import {
  NURO_SYMBOL,
  NURO_TOKEN,
  ROBINHOOD_CHAIN_ID,
  encodeErc20Transfer,
  explorerAddressUrl,
  explorerTxUrl,
  formatUnits,
  getErc20Balance,
  getErc20Decimals,
  isAddress,
  parseUnits,
  shortAddress,
} from "../../lib/token";

type SendPhase = "idle" | "sending" | "done" | "error";

export default function ProfileApp() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const activeWallet = useMemo(
    () => getEmbeddedConnectedWallet(wallets) ?? wallets[0],
    [wallets],
  );
  const address = activeWallet?.address ?? "";
  const isEmbedded = activeWallet
    ? getEmbeddedConnectedWallet(wallets)?.address === activeWallet.address
    : false;

  if (!ready) return <ProfileShell>{null}</ProfileShell>;

  if (!authenticated) {
    return (
      <ProfileShell>
        <div className="glass-panel mx-auto mt-10 max-w-md rounded-[1.75rem] p-8 text-center md:p-10">
          <p className="label-caps">Your account</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
            Sign in to view your profile
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#8a8a8a]">
            Log in to see your wallet, your {NURO_SYMBOL} balance, and send or
            receive on Robinhood Chain.
          </p>
          <button
            type="button"
            onClick={() => void login()}
            className="btn-primary mt-6 w-full justify-center py-3"
          >
            Login
          </button>
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell>
      <ProfileHeader user={user} onLogout={() => void logout()} />
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <WalletCard address={address} isEmbedded={isEmbedded} />
        <BalanceCard address={address} />
      </div>
      <SendReceive address={address} sendFromAddress={address} />
    </ProfileShell>
  );
}

function ProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative pt-16 pb-24 md:pt-20">{children}</main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- header */

function ProfileHeader({
  user,
  onLogout,
}: {
  user: ReturnType<typeof usePrivy>["user"];
  onLogout: () => void;
}) {
  const u = user as any;
  const email: string | undefined = u?.email?.address ?? u?.google?.email;
  const twitter: string | undefined = u?.twitter?.username;
  const displayName = twitter
    ? `@${twitter}`
    : (email ?? shortAddress(u?.wallet?.address ?? ""));
  const avatarUrl: string | undefined = u?.twitter?.profilePictureUrl;
  const initial = (displayName || "N").replace(/^@/, "").charAt(0).toUpperCase();

  const linked: { label: string; value: string }[] = [];
  if (email) linked.push({ label: "Email", value: email });
  if (twitter) linked.push({ label: "X", value: `@${twitter}` });
  if (u?.google?.email) linked.push({ label: "Google", value: u.google.email });

  return (
    <div className="glass-panel flex flex-col gap-5 rounded-[1.75rem] p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/[0.14] bg-white/[0.04]">
          {avatarUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={avatarUrl} className="h-full w-full object-cover" alt="" />
          ) : (
            <span className="font-display text-2xl text-[#D4F3FF]">{initial}</span>
          )}
        </div>
        <div>
          <p className="label-caps">Profile</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
            {displayName || "Nuro user"}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {linked.map((l) => (
              <span
                key={l.label}
                className="rounded-full border border-white/[0.08] bg-black/40 px-3 py-1 text-[11px] text-[#8a8a8a]"
              >
                <span className="text-[#5c5c5c]">{l.label}</span> · {l.value}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="btn-secondary self-start px-5 py-2.5 text-xs md:self-auto"
      >
        Log out
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- wallet */

function WalletCard({
  address,
  isEmbedded,
}: {
  address: string;
  isEmbedded: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <article className="card glass-panel rounded-[1.5rem] p-6 md:p-7">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-[#D4F3FF]">
          Wallet
        </h2>
        <span className="rounded-full border border-white/[0.08] bg-black/40 px-3 py-1 text-[11px] text-[#8a8a8a]">
          {isEmbedded ? "Embedded" : "Connected"} · Robinhood Chain
        </span>
      </div>

      {address ? (
        <>
          <p className="mt-4 break-all font-mono text-sm text-white/90">
            {address}
          </p>
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={copy}
              className="btn-secondary flex-1 justify-center py-2.5 text-xs"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <a
              href={explorerAddressUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex-1 justify-center py-2.5 text-xs"
            >
              View on explorer
            </a>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-[#8a8a8a]">
          No wallet yet. It's created automatically on your next login.
        </p>
      )}
    </article>
  );
}

/* ---------------------------------------------------------------- balance */

function useNuroBalance(address: string) {
  const [decimals, setDecimals] = useState(18);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const [dec, bal] = await Promise.all([
        getErc20Decimals(NURO_TOKEN),
        getErc20Balance(NURO_TOKEN, address),
      ]);
      setDecimals(dec);
      setBalance(bal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load balance");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { decimals, balance, loading, error, refresh };
}

function BalanceCard({ address }: { address: string }) {
  const { decimals, balance, loading, error, refresh } = useNuroBalance(address);

  return (
    <article className="card glass-panel flex flex-col rounded-[1.5rem] p-6 md:p-7">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-[#D4F3FF]">
          Balance
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-[11px] text-[#8a8a8a] transition-colors hover:text-white"
        >
          Refresh
        </button>
      </div>
      <div className="mt-auto pt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-[-0.03em] text-white">
            {loading && balance === null
              ? "—"
              : balance === null
                ? "0"
                : formatUnits(balance, decimals)}
          </span>
          <span className="text-gradient text-lg font-semibold">
            ${NURO_SYMBOL}
          </span>
        </div>
        {error ? (
          <p className="mt-2 text-[12px] text-[#ff9b9b]">{error}</p>
        ) : (
          <p className="mt-2 text-[12px] text-[#5c5c5c]">
            Live from Robinhood Chain
          </p>
        )}
      </div>
    </article>
  );
}

/* ----------------------------------------------------------- send/receive */

function SendReceive({
  address,
  sendFromAddress,
}: {
  address: string;
  sendFromAddress: string;
}) {
  const [tab, setTab] = useState<"receive" | "send">("receive");

  return (
    <div className="glass-panel mt-4 rounded-[1.75rem] p-6 md:p-8">
      <div className="inline-flex rounded-full border border-white/[0.08] bg-black/40 p-1">
        {(["receive", "send"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? "bg-[#7ED6FF]/[0.14] text-[#D4F3FF]"
                : "text-[#8a8a8a] hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "receive" ? (
          <ReceivePanel address={address} />
        ) : (
          <SendPanel fromAddress={sendFromAddress} />
        )}
      </div>
    </div>
  );
}

function ReceivePanel({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="max-w-xl">
      <p className="text-sm leading-relaxed text-[#8a8a8a]">
        Share this address to receive ${NURO_SYMBOL} or any asset on{" "}
        <span className="text-white">Robinhood Chain</span>. Sending assets from
        another network will lose them.
      </p>
      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
        <p className="break-all font-mono text-sm text-white/90">
          {address || "—"}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={!address}
        className="btn-primary mt-4 justify-center px-6 py-2.5 text-sm disabled:opacity-40"
      >
        {copied ? "Copied" : "Copy address"}
      </button>
    </div>
  );
}

function SendPanel({ fromAddress }: { fromAddress: string }) {
  const { sendTransaction } = useSendTransaction();
  const { decimals, balance, refresh } = useNuroBalance(fromAddress);

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const busy = phase === "sending";
  const balanceLabel =
    balance === null ? "—" : formatUnits(balance, decimals);

  const setMax = () => {
    if (balance !== null) setAmount(formatUnits(balance, decimals, decimals));
  };

  const submit = async () => {
    setError(null);
    setTxHash(null);

    if (!isAddress(to)) {
      setError("Enter a valid Robinhood Chain address (0x…).");
      return;
    }
    let value: bigint;
    try {
      value = parseUnits(amount, decimals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid amount");
      return;
    }
    if (value <= 0n) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (balance !== null && value > balance) {
      setError("Amount exceeds your balance.");
      return;
    }

    try {
      setPhase("sending");
      const { hash } = await sendTransaction(
        {
          to: NURO_TOKEN,
          data: encodeErc20Transfer(to, value),
          chainId: ROBINHOOD_CHAIN_ID,
        },
        fromAddress ? { address: fromAddress } : undefined,
      );
      setTxHash(hash);
      setPhase("done");
      setAmount("");
      setTo("");
      setTimeout(() => void refresh(), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      setError(
        /reject|denied|cancell?ed/i.test(msg) ? "Transaction cancelled." : msg,
      );
      setPhase("error");
    }
  };

  return (
    <div className="max-w-xl">
      <label className="block text-[13px] font-medium text-[#c9c9c9]">
        Recipient address
      </label>
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="0x…"
        spellCheck={false}
        className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-[#7ED6FF]/50"
      />

      <div className="mt-4 flex items-center justify-between">
        <label className="text-[13px] font-medium text-[#c9c9c9]">
          Amount (${NURO_SYMBOL})
        </label>
        <button
          type="button"
          onClick={setMax}
          className="text-[11px] text-[#8a8a8a] transition-colors hover:text-white"
        >
          Balance: {balanceLabel} · Max
        </button>
      </div>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#7ED6FF]/50"
      />

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="btn-primary mt-5 w-full justify-center py-3 disabled:opacity-40"
      >
        {busy ? "Confirm in wallet…" : `Send ${NURO_SYMBOL}`}
      </button>

      {phase === "done" && txHash && (
        <p className="mt-3 text-center text-[13px] text-[#7ee6a6]">
          Sent.{" "}
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
          >
            View transaction
          </a>
        </p>
      )}
      {error && (
        <p className="mt-3 text-center text-[13px] text-[#ff9b9b]">{error}</p>
      )}
    </div>
  );
}
