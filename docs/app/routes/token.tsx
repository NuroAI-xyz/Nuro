import type { Route } from "./+types/token";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  Figure,
  CardGrid,
  InfoCard,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { MoneyFlow } from "../components/brand/diagrams";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Token and economics - Nuro Docs" },
    {
      name: "description",
      content:
        "$NURO is the metering unit, the staking asset, and the governance token of the network. Real revenue flows to workers, treasury, and stakers.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "roles", text: "Three roles", depth: 2 },
  { id: "flow", text: "How revenue flows", depth: 2 },
  { id: "split", text: "The settlement split", depth: 2 },
  { id: "chain", text: "Chain and launch", depth: 2 },
];

export default function Token() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="$NURO"
        title="Token and economics"
        lead="$NURO ties the network together: it is how inference is metered, how contributors and backers earn, and how the network's privacy parameters are eventually governed."
      />

      <div className="prose-docs">
        <h2 id="roles">Three roles</h2>
        <CardGrid>
          <InfoCard title="Metering unit">
            Inference is billed in $NURO (or in a stable that settles to it).
            Tokens are the unit of account - there is no prompt history and no
            profile behind the bill. Metered, not monitored.
          </InfoCard>
          <InfoCard title="Staking asset">
            Stake $NURO to align with the network and earn a share of real
            revenue. Principal stays in a vault only your wallet can withdraw
            from.
          </InfoCard>
          <InfoCard title="Governance">
            Over time, stakers govern the parameters that matter most - above
            all the privacy thresholds the receipts are checked against.
          </InfoCard>
          <InfoCard title="Treasury fuel">
            A share of every settlement funds the treasury that underwrites the
            privacy research proving the network's core claim.
          </InfoCard>
        </CardGrid>

        <h2 id="flow">How revenue flows</h2>
        <p>
          Nuro runs on real yield, not emissions. The money that moves through
          the system originates from actual paid inference - the compute margin
          on jobs the swarm serves - plus a share of $NURO trading fees.
        </p>
        <Figure caption="Inference revenue splits to workers, treasury, and the staking pool. The treasury both buys back and burns $NURO and pays USDG yield to stakers.">
          <MoneyFlow />
        </Figure>

        <h2 id="split">The settlement split</h2>
        <p>
          Each settled job is split roughly as follows, and the treasury share
          is then put to work:
        </p>
        <ul>
          <li>
            <strong>~60% to GPU workers</strong> - paid per job, released only
            against a valid receipt.
          </li>
          <li>
            <strong>~30% to the treasury</strong> - funds privacy research and
            the buyback engine.
          </li>
          <li>
            <strong>~10% to the staking pool</strong> - funded to stakers as
            real yield.
          </li>
        </ul>
        <Callout tone="info" title="Treasury policy: half and half">
          Of the value flowing into the treasury, roughly half buys back and
          burns $NURO (removing supply permanently) and half is paid to stakers
          in USDG. The live figures are shown on the treasury dashboard. See{" "}
          <a href="/economics">Staking and treasury</a>.
        </Callout>
        <Callout tone="neutral" title="Policy versus on-chain">
          These percentages are the target economic policy. Some splits are
          enforced off-chain at settlement today and will move on-chain as the
          settlement contract lands; the treasury dashboard shows preview data
          until the indexer is wired. We label what is live versus targeted
          rather than blur them.
        </Callout>

        <h2 id="chain">Chain and launch</h2>
        <p>
          $NURO is an ERC-20 token launched externally and deployed on Robinhood
          Chain (an EVM network). The website reads the token, reward token, and
          staking contract addresses from environment configuration, so staking
          and treasury light up automatically once the contracts are set.
        </p>
        <Callout tone="warn" title="Audit gate">
          The staking contract is self-custody by construction, but custody of
          real funds waits on an audit. Contracts are treated with the same
          "not proven until measured" discipline as the inference stack.
        </Callout>
      </div>
    </DocsLayout>
  );
}
