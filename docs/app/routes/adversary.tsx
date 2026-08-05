import type { Route } from "./+types/adversary";
import { DocsLayout } from "../components/layout/docs-shell";
import { DocHeader, Callout, Figure } from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { LeakageBar } from "../components/brand/diagrams";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "The reconstruction adversary - Nuro Docs" },
    {
      name: "description",
      content:
        "Privacy is meaningless without an attacker. Nuro defines a first-class reconstruction adversary and reports the number it recovers.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "why", text: "Why an adversary", depth: 2 },
  { id: "definition", text: "The adversary, defined", depth: 2 },
  { id: "metric", text: "The metric", depth: 2 },
  { id: "baseline", text: "The baseline we inherit", depth: 2 },
  { id: "strength", text: "Weak and strong attackers", depth: 2 },
];

export default function Adversary() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Privacy"
        title="The reconstruction adversary"
        lead="You cannot claim privacy without naming the attacker you are private against. Nuro makes the attacker a first-class object and publishes exactly how much it recovers."
      />

      <div className="prose-docs">
        <h2 id="why">Why an adversary</h2>
        <p>
          "Private" with no adversary is a marketing word. The only honest way
          to talk about privacy is to define a concrete attacker, give it the
          strongest realistic access, measure what it recovers, and report that
          number - even when it is embarrassing.
        </p>

        <h2 id="definition">The adversary, defined</h2>
        <Callout tone="info" title="Reconstruction adversary">
          Given exactly the activations a given node processes for a request -
          its block's inputs and outputs - how much of the user's{" "}
          <strong>input</strong> can it recover?
        </Callout>
        <p>
          This models the real threat in a decentralized network: a node you do
          not control runs one of your layers, and to do so it must decrypt the
          activations it receives. It is honest-but-curious at minimum, and
          possibly malicious. The question is not "could someone tap the wire"
          (the wire is sealed) but "what can the machine at the end of the wire
          learn."
        </p>

        <h2 id="metric">The metric</h2>
        <p>
          The load-bearing number is the <strong>fraction of input tokens
          reconstructed</strong>, with a distributional variant (top-k token
          recovery) for partial leaks. It is computed per node, and the receipt
          reports the worst case across all untrusted nodes.
        </p>
        <Figure caption="Token recovery on an untrusted node: the inherited baseline, the receipt pass line, and the result once per-request obfuscation is applied.">
          <LeakageBar />
        </Figure>

        <h2 id="baseline">The baseline we inherit</h2>
        <p>
          Prior work established the counter-fact that motivates the whole
          project: a node running your layer can reconstruct roughly{" "}
          <strong>35 to 59 percent</strong> of your tokens from the intermediate
          activations it legitimately sees. Sealing the wire does not touch this
          number at all. That baseline is the thing Nuro exists to drive down.
        </p>

        <h2 id="strength">Weak and strong attackers</h2>
        <ul>
          <li>
            <strong>Cheap attacker</strong> - map each activation to its nearest
            public token embedding. Fast, no training, surprisingly effective.
          </li>
          <li>
            <strong>Strong attacker</strong> - a trained probe (for example a
            linear or small neural model) that learns to invert activations back
            to tokens.
          </li>
        </ul>
        <Callout tone="warn" title="We report the worst case">
          A defense only counts if it holds against the stronger attacker. The
          privacy receipt records the highest recovery any untrusted node
          achieved, not an average and not the friendliest attacker. Next, see
          how obfuscation collapses that number on{" "}
          <a href="/privacy-receipts">Obfuscation and receipts</a>.
        </Callout>
      </div>
    </DocsLayout>
  );
}
