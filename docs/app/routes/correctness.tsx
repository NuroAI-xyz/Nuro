import type { Route } from "./+types/correctness";
import { DocsLayout } from "../components/layout/docs-shell";
import { DocHeader, Callout, CodeBlock } from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Correctness receipts - Nuro Docs" },
    {
      name: "description",
      content:
        "Gate A: proving a sharded run produces the same output as the whole model, with a receipt anyone can re-check.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "claim", text: "The claim", depth: 2 },
  { id: "gate", text: "Gate A", depth: 2 },
  { id: "receipt", text: "What a receipt contains", depth: 2 },
  { id: "attest", text: "Attestation and honesty", depth: 2 },
];

export default function Correctness() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Architecture"
        title="Correctness receipts"
        lead="Before privacy means anything, the split run has to be right. A correctness receipt proves the sharded output matches the whole model, bit for bit."
      />

      <div className="prose-docs">
        <h2 id="claim">The claim</h2>
        <p>
          Splitting a model across machines is only useful if it computes the
          same answer as the unsplit model. The correctness claim is strict:
        </p>
        <Callout tone="info" title="Gate A definition">
          Greedy output is <strong>token-identical</strong> between the split
          run and the single-process reference. If it does not match exactly,
          nothing else in the project matters yet.
        </Callout>

        <h2 id="gate">Gate A</h2>
        <p>
          The runnable harness demonstrates this on CPU in seconds. It runs a
          model in two stages - first in-process, then across two operating
          system processes over the sealed wire - with no stage ever holding the
          whole model, and checks that the logits and sampled tokens are
          bit-identical.
        </p>
        <CodeBlock>{`.venv/bin/python -m proof.correctness_gate

# PASS: split logits == reference logits (bitwise)
# PASS: greedy tokens identical across 2 processes over the sealed wire
# no stage held the full model`}</CodeBlock>

        <h2 id="receipt">What a receipt contains</h2>
        <p>
          A receipt is a JSON document (format <code>nuro-receipt/v1</code>)
          that a third party can re-check without trusting the operator. The
          correctness block records, among other fields:
        </p>
        <ul>
          <li>
            <strong>Distinct participants</strong> - separate public IPs and GPU
            UUIDs, across multiple regions, so it was genuinely decentralized.
          </li>
          <li>
            <strong>WAN-scale latency</strong> - measured round-trips above a
            floor, showing hops crossed the real internet rather than one box.
          </li>
          <li>
            <strong>Output hash</strong> - a SHA-256 of the output, optionally
            matched against a reference token sequence.
          </li>
        </ul>

        <h2 id="attest">Attestation and honesty</h2>
        <Callout tone="warn" title="Self-reported by default">
          A receipt's attestation level is <code>self-reported</code> unless a
          signed envelope is present. Verification checks internal consistency -
          distinct nodes, plausible latencies, a matching hash - not a trusted
          hardware attestation. We say so plainly rather than overclaim, and
          stronger attestation (signed identities, trustless compute
          verification) is on the roadmap.
        </Callout>
        <p>
          Correctness is the foundation the privacy receipt builds on: the same
          run that proves the output is right also carries the measured proof
          that the input stayed hidden. See{" "}
          <a href="/privacy-receipts">Obfuscation and receipts</a>.
        </p>
      </div>
    </DocsLayout>
  );
}
