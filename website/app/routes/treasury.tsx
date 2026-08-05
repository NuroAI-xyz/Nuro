import type { Route } from "./+types/treasury";
import { SiteFooter, SiteHeader } from "../components/layout/site-chrome";
import { Reveal } from "../components/util/reveal";
import { AreaChart } from "../components/brand/area-chart";
import {
  useTreasury,
  type TreasurySeriesPoint,
} from "../lib/use-treasury";

const BURN_COLOR = "#4ADE80";
const STAKE_COLOR = "#7ED6FF";

// Live treasury metrics are not wired yet - show a "coming soon" state instead
// of placeholder numbers. Flip to false once the on-chain indexer is connected.
const COMING_SOON = true;
const PLACEHOLDER = "-";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Treasury - Nuro AI" },
    {
      name: "description",
      content:
        "100% of the compute margin and a share of $NURO trading fees flow into the treasury. Half buys back and burns $NURO; half is paid to stakers in USDC.",
    },
  ];
}

// ---- formatting helpers ----
const intFmt = new Intl.NumberFormat("en-US");
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function compact(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}b`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}m`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return intFmt.format(Math.round(n));
}

function pct(n: number) {
  return `${n.toFixed(n < 10 ? 2 : 1)}%`;
}

function shortDate(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(ms));
}

export default function TreasuryPage() {
  const { data, preview } = useTreasury();

  const topCards = [
    {
      value: COMING_SOON ? PLACEHOLDER : intFmt.format(data.burnedForever),
      label: "$NURO burned forever",
      sub: COMING_SOON
        ? "Coming soon"
        : `${pct(data.burnedPctSupply)} of supply removed`,
      accent: true,
    },
    {
      value: COMING_SOON ? PLACEHOLDER : usdFmt.format(data.returnedTotalUsd),
      label: "returned to holders + stakers",
      sub: COMING_SOON ? "Coming soon" : "buybacks + USDC rewards",
    },
    {
      value: COMING_SOON ? PLACEHOLDER : `${compact(data.staked)}`,
      label: "$NURO staked",
      sub: COMING_SOON ? "Coming soon" : `${pct(data.stakedPctSupply)} of supply`,
    },
  ];

  const bottomCards = [
    {
      value: COMING_SOON ? PLACEHOLDER : usdFmt.format(data.totalSpentBuybacksUsd),
      label: "Total spent on buybacks",
    },
    {
      value: COMING_SOON ? PLACEHOLDER : usdFmt.format(data.stakerRewardsPaidUsd),
      label: "Staker rewards paid",
    },
    {
      value: COMING_SOON ? PLACEHOLDER : usdFmt.format(data.pendingBuybackUsd),
      label: "Pending buyback",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative pt-20 pb-24 md:pt-28">
        <Reveal>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              Treasury
            </h1>
            {(COMING_SOON || preview) && (
              <span className="rounded-full border border-[#FFE7A8]/25 bg-[#FFE7A8]/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#FFE7A8]">
                {COMING_SOON ? "Coming soon" : "Preview data"}
              </span>
            )}
          </div>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#8a8a8a] md:text-lg">
            100% of the compute margin and a share of $NURO trading fees flow
            into this treasury. Half buys back and burns $NURO; half is paid to
            stakers in USDC.{" "}
            {COMING_SOON
              ? "Live figures are under development and will appear here soon."
              : "Everything below updates live."}
          </p>
        </Reveal>

        {/* Top stat cards */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {topCards.map((c, i) => (
            <Reveal key={c.label} delay={i * 80} variant="scale">
              <div
                className={`glass-panel h-full rounded-2xl p-6 ${
                  c.accent
                    ? "border-[#4ADE80]/25 bg-[#4ADE80]/[0.04]"
                    : ""
                }`}
              >
                <p
                  className={`text-3xl font-semibold tracking-[-0.02em] ${
                    c.accent ? "text-[#4ADE80]" : ""
                  }`}
                >
                  {c.value}
                </p>
                <p className="mt-2 text-[15px] text-[#a3a3a3]">{c.label}</p>
                <p
                  className={`mt-1 text-[13px] ${
                    c.accent ? "text-[#4ADE80]/70" : "text-[#6f6f6f]"
                  }`}
                >
                  {c.sub}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Reveal delay={60} variant="left">
            <ChartCard
              caption="Cumulative $NURO burned"
              headline={COMING_SOON ? PLACEHOLDER : `${compact(data.burnedForever)} NURO`}
              sub={COMING_SOON ? "Coming soon" : `across ${data.buybackCount} buybacks`}
              series={data.burnedSeries}
              color={BURN_COLOR}
              comingSoon={COMING_SOON}
            />
          </Reveal>
          <Reveal delay={140} variant="right">
            <ChartCard
              caption="$NURO staked over time"
              headline={COMING_SOON ? PLACEHOLDER : `${compact(data.staked)} NURO`}
              sub={COMING_SOON ? "Coming soon" : "rises on stakes, dips on unstakes"}
              series={data.stakedSeries}
              color={STAKE_COLOR}
              comingSoon={COMING_SOON}
            />
          </Reveal>
        </div>

        {/* Bottom stat cards */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {bottomCards.map((c, i) => (
            <Reveal key={c.label} delay={i * 80} variant="fade">
              <div className="glass-panel h-full rounded-2xl p-6 text-center">
                <p className="text-2xl font-semibold tracking-[-0.02em]">
                  {c.value}
                </p>
                <p className="mt-1.5 text-[13px] text-[#6f6f6f]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ChartCard({
  caption,
  headline,
  sub,
  series,
  color,
  comingSoon = false,
}: {
  caption: string;
  headline: string;
  sub: string;
  series: TreasurySeriesPoint[];
  color: string;
  comingSoon?: boolean;
}) {
  const values = series.map((p) => p.v);
  const startLabel = series.length ? shortDate(series[0].t) : "";
  const endLabel = series.length ? shortDate(series[series.length - 1].t) : "";

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-6">
      <p className="section-index">{caption}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
        {headline}
      </p>
      <p className="mt-1 text-[13px] text-[#6f6f6f]">{sub}</p>

      {comingSoon ? (
        <div className="mt-5 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-white/[0.1] md:h-48">
          <div className="text-center">
            <p className="text-sm font-medium text-[#8a8a8a]">Coming soon</p>
            <p className="mt-1 text-[12px] text-[#5c5c5c]">Under development</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 h-40 w-full md:h-48">
            <AreaChart
              data={values}
              color={color}
              className="h-full w-full"
              ariaLabel={caption}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-[#5c5c5c]">
            <span>{startLabel}</span>
            <span>{endLabel}</span>
          </div>
        </>
      )}
    </div>
  );
}
