import type { Route } from "./+types/staking";
import { SiteFooter, SiteHeader } from "../components/layout/site-chrome";
import { Reveal } from "../components/util/reveal";

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
            unstake or
            claim - no server holds your funds. Stakers earn a share of real
            network revenue from inference.
          </p>
        </Reveal>

        <StakeCard />
        <RevenueNote />
      </main>
      <SiteFooter />
    </div>
  );
}

function StakeCard() {
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
          anytime, and claim USDG rewards from real network revenue.
        </p>
      </div>
    </Reveal>
  );
}

function RevenueNote() {
  const points = [
    {
      title: "Where yield comes from",
      body: "Every paid inference request is split on-chain: the majority to the GPU workers that served it, a treasury cut for privacy research, and a slice funded to this staking pool.",
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
