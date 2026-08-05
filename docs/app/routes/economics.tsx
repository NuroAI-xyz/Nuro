import type { Route } from "./+types/economics";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  DefTable,
  StatGrid,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Staking and treasury - Nuro Docs" },
    {
      name: "description",
      content:
        "Self-custody $NURO staking with real-yield rewards, and the treasury that buys back and burns while paying USDC to stakers.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "staking", text: "Self-custody staking", depth: 2 },
  { id: "mechanics", text: "How rewards accrue", depth: 2 },
  { id: "actions", text: "Actions", depth: 2 },
  { id: "treasury", text: "The treasury", depth: 2 },
  { id: "guarantees", text: "Self-custody guarantees", depth: 2 },
];

export default function Economics() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="$NURO"
        title="Staking and treasury"
        lead="Stake from your own wallet and earn a share of real network revenue. The treasury turns compute margin and fees into buybacks, burns, and USDC yield."
      />

      <div className="prose-docs">
        <h2 id="staking">Self-custody staking</h2>
        <p>
          Staked $NURO stays in an on-chain vault that only your wallet can
          withdraw from. There is no server that holds your funds, and no admin
          key that can move, seize, or slash your stake. Stakers earn a share of
          real network revenue, not inflationary emissions.
        </p>

        <h2 id="mechanics">How rewards accrue</h2>
        <p>
          The staking contract uses the well-worn accumulator pattern (a
          MasterChef-style <code>accRewardPerShare</code>) so rewards are
          distributed pro-rata to everyone staked at the moment revenue arrives.
          When the treasury funds rewards, the accumulator increases and every
          staker's claimable balance grows in proportion to their share.
        </p>
        <Callout tone="info" title="Real yield">
          Rewards are funded from actual revenue via a fund-rewards call, paid
          in USDC. If nothing is staked, there is nothing to fund - rewards only
          exist because real work was paid for.
        </Callout>

        <h2 id="actions">Actions</h2>
        <DefTable
          rows={[
            { term: "Stake", def: "Deposit $NURO into your vault and start earning a share of funded rewards." },
            { term: "Unstake", def: "Withdraw principal after the unstake cooldown (configurable, capped at 7 days) since your last stake." },
            { term: "Claim", def: "Collect accrued USDC rewards to your wallet at any time." },
            { term: "Compound", def: "Restake rewards in one step - available only when the reward token equals the stake token." },
          ]}
        />

        <h2 id="treasury">The treasury</h2>
        <p>
          The treasury is where the compute margin and a share of $NURO trading
          fees collect. Its policy is simple and split down the middle:
        </p>
        <StatGrid
          items={[
            { value: "50%", label: "Buys back $NURO from the market and burns it, permanently removing supply", accent: true },
            { value: "50%", label: "Paid to stakers in USDC as real yield", accent: false },
            { value: "live", label: "Burn, buyback, and staked totals surface on the treasury dashboard", accent: false },
          ]}
        />
        <Callout tone="neutral" title="Preview until wired">
          The treasury dashboard renders with clearly-labelled preview figures
          until the on-chain indexer is connected, at which point burned,
          bought-back, and staked totals update live.
        </Callout>

        <h2 id="guarantees">Self-custody guarantees</h2>
        <ul>
          <li>
            <strong>Only you withdraw.</strong> Principal lives in a vault keyed
            to your wallet; no operator path can move it.
          </li>
          <li>
            <strong>No slashing.</strong> There is no admin function to seize or
            reduce your stake.
          </li>
          <li>
            <strong>Core tokens are protected.</strong> The owner cannot rescue
            or withdraw the stake and reward tokens - only unrelated tokens sent
            in by mistake.
          </li>
        </ul>
        <Callout tone="warn" title="Audit gate">
          Self-custody is enforced by the contract's construction, but custody
          of real value waits on an audit before mainnet. See{" "}
          <a href="/token">Token and economics</a> for the full revenue model.
        </Callout>
      </div>
    </DocsLayout>
  );
}
