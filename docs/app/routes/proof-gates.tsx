import type { Route } from "./+types/proof-gates";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  Figure,
  CodeBlock,
  DefTable,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { GateLadder } from "../components/brand/diagrams";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Proof gates - Nuro Docs" },
    {
      name: "description",
      content:
        "The gates that sequence Nuro: correctness, real WAN, KV cache, and privacy. Nothing advances until the gate before it passes.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "idea", text: "Gates, not milestones", depth: 2 },
  { id: "ladder", text: "The ladder", depth: 2 },
  { id: "run", text: "Run them yourself", depth: 2 },
  { id: "sequencing", text: "The sequencing rule", depth: 2 },
];

export default function ProofGates() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Privacy"
        title="Proof gates"
        lead="Progress is gated, not promised. Each gate is a concrete, runnable check, and the project does not move past a gate until it passes."
      />

      <div className="prose-docs">
        <h2 id="idea">Gates, not milestones</h2>
        <p>
          A milestone is a date; a gate is a test. Nuro organizes its
          development as a ladder of gates, each one a specific claim you can
          reproduce. This keeps the roadmap honest: a feature is not "done"
          because it shipped, it is done because its gate passes.
        </p>

        <Figure caption="The gate ladder. Gate A (correctness) and Gate D (privacy obfuscation) are proven on a CPU harness today; B and C are the WAN and cache gates in between.">
          <GateLadder />
        </Figure>

        <h2 id="ladder">The ladder</h2>
        <DefTable
          rows={[
            {
              term: "Gate A - Correctness",
              def: "Greedy output is token-identical between the split run and the single-process reference. Proven today on CPU.",
            },
            {
              term: "Gate B - Real WAN",
              def: "Two machines across the real internet run the pipeline and emit the first correctness receipt with genuine round-trip latency.",
            },
            {
              term: "Gate C - KV cache",
              def: "Key-value caching across the sharded pipeline so multi-token decode runs at speed, not just single forward passes.",
            },
            {
              term: "Gate D - Privacy",
              def: "The reconstruction adversary's recovery on any untrusted node falls below the declared threshold, with a quantified and acceptable quality cost. Obfuscation proven today on a mini model.",
            },
          ]}
        />

        <h2 id="run">Run them yourself</h2>
        <p>
          The gates are not screenshots - they are scripts that finish in
          seconds on a laptop CPU.
        </p>
        <CodeBlock>{`# correctness: bit-identical split vs whole
.venv/bin/python -m proof.correctness_gate

# privacy diagnostic: shows boundary pinning alone is NOT enough
.venv/bin/python -m proof.privacy_probe

# privacy gate: obfuscation drops recovery to near chance, output identical
.venv/bin/python -m proof.obfuscation_gate`}</CodeBlock>
        <Callout tone="info" title="The diagnostic is included on purpose">
          The <code>privacy_probe</code> is the failing case: it demonstrates
          that pinning the boundary leaves the embedding in the residual stream
          and the prompt fully recoverable. Shipping the failure alongside the
          fix is the honesty rule in code.
        </Callout>

        <h2 id="sequencing">The sequencing rule</h2>
        <Callout tone="warn" title="Order is load-bearing">
          Correctness (A), then real WAN (B), then cache (C), then the privacy
          proof (D). Speed optimizations and the permissionless economy come
          after the network can prove the two things the product name promises:
          the output is right, and the input stayed hidden.
        </Callout>
      </div>
    </DocsLayout>
  );
}
