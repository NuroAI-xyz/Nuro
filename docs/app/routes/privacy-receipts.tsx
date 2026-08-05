import type { Route } from "./+types/privacy-receipts";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  Figure,
  CodeBlock,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { ObfuscationDiagram } from "../components/brand/diagrams";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Obfuscation and receipts - Nuro Docs" },
    {
      name: "description",
      content:
        "A per-request secret signed permutation rotates the residual stream so untrusted nodes compute correctly without seeing your prompt - proven and receipted.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "first", text: "The first honest failure", depth: 2 },
  { id: "trick", text: "The obfuscation trick", depth: 2 },
  { id: "why", text: "Why the output survives", depth: 2 },
  { id: "assume", text: "The assumption", depth: 2 },
  { id: "receipt", text: "The privacy receipt", depth: 2 },
];

export default function PrivacyReceipts() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Privacy"
        title="Obfuscation and receipts"
        lead="A per-request secret rotation of the hidden dimension lets untrusted nodes do their work in a scrambled basis - correct output, near-zero prompt recovery - and the result is written into a receipt."
      />

      <div className="prose-docs">
        <h2 id="first">The first honest failure</h2>
        <p>
          The obvious defense is boundary pinning: keep the embedding and final
          layers on trusted nodes. On its own, it is not enough. The input
          embedding persists in the residual stream, so a decrypting middle node
          reconstructs the prompt at essentially every depth - close to 100
          percent recovery on a small model.
        </p>
        <Callout tone="warn" title="Named, not hidden">
          This is the hard truth the thesis states out loud. Pinning the
          boundary reduces exposure but does not remove the signal an untrusted
          node sees. Something has to change the basis the middle node computes
          in.
        </Callout>

        <h2 id="trick">The obfuscation trick</h2>
        <p>
          For each request, the trusted head draws a <strong>secret signed
          permutation</strong> <code>R</code> of the hidden dimension - an
          orthogonal transform that shuffles and sign-flips the channels. It
          applies <code>R</code> to the residual stream before handing off. The
          untrusted middle node does not hold <code>R</code>; instead it holds
          its blocks' weights <strong>conjugated</strong> by <code>R</code>{" "}
          (<code>W' = W R</code>). The trusted tail undoes <code>R</code> at the
          end.
        </p>

        <Figure caption="The head applies a fresh secret rotation R; the untrusted worker runs conjugated weights W' = W R and never sees R; the tail undoes R.">
          <ObfuscationDiagram />
        </Figure>

        <h2 id="why">Why the output survives</h2>
        <p>
          Because RMSNorm is invariant under a signed permutation, the
          conjugated block computes the correct answer in the rotated basis. The
          whole-model output is <strong>bit-identical</strong> to the unrotated
          run - yet the middle node never sees, and never needs, <code>R</code>.
          To its reconstruction adversary the activations look like noise.
        </p>
        <CodeBlock>{`Without obfuscation:   untrusted recovery ~= 100%
With obfuscation:      untrusted recovery ~= 0.3%   (chance ~= 0.20%)
Output:                bit-identical greedy tokens
Receipt threshold:     10%   ->   PASS`}</CodeBlock>

        <h2 id="assume">The assumption</h2>
        <Callout tone="info" title="What must hold">
          The security rests on one stated assumption: an untrusted node cannot
          recover <code>R</code> from its conjugated weights versus the public
          weights, and <code>R</code> is drawn fresh for every request. We state
          this assumption explicitly rather than burying it, so it can be
          attacked and strengthened.
        </Callout>

        <h2 id="receipt">The privacy receipt</h2>
        <p>
          The privacy block of the receipt records the defenses in play, the
          layer-to-node assignment, and the per-node recovery scores. The
          load-bearing field is <code>worst_untrusted_recovery</code>: the
          maximum token recovery over every node not marked trusted. The run{" "}
          <strong>passes</strong> only if that worst case is below the declared
          threshold.
        </p>
        <CodeBlock>{`{
  "format": "nuro-receipt/v1",
  "privacy": {
    "threshold": 0.10,
    "defenses": ["boundary_pinning", "signed_permutation_obfuscation"],
    "per_node": [
      { "node": "head",   "trust_tier": "operator",  "token_recovery": 0.00 },
      { "node": "mid-A",  "trust_tier": "volunteer", "token_recovery": 0.003 },
      { "node": "tail",   "trust_tier": "operator",  "token_recovery": 0.00 }
    ],
    "worst_untrusted_recovery": 0.003,
    "pass": true
  }
}`}</CodeBlock>
        <Callout tone="neutral" title="What a pass means">
          A passing receipt proves that <em>this specific run</em> kept the
          prompt private to a measured degree, under the stated adversary and
          assumption. It is not a blanket guarantee for all runs, and Nuro
          never presents it as one.
        </Callout>
      </div>
    </DocsLayout>
  );
}
