import type { Route } from "./+types/sharded-inference";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  Figure,
  CodeBlock,
  StatGrid,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { PipelineFlow } from "../components/brand/diagrams";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Sharded inference - Nuro Docs" },
    {
      name: "description",
      content:
        "How Nuro splits a transformer across machines nobody owns and still serves it fast over the open internet.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "idea", text: "The core idea", depth: 2 },
  { id: "wan", text: "The WAN performance law", depth: 2 },
  { id: "runtime", text: "The ModelRuntime interface", depth: 2 },
  { id: "trust", text: "Trust tiers and placement", depth: 2 },
  { id: "numbers", text: "Measured throughput", depth: 2 },
];

export default function ShardedInference() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Architecture"
        title="Sharded inference"
        lead="A model too big for any single GPU is split into contiguous layer blocks and streamed across machines. No node ever holds the whole model."
      />

      <div className="prose-docs">
        <h2 id="idea">The core idea</h2>
        <p>
          A transformer is a stack of layers. Split the stack into contiguous
          blocks, put one block on each machine, and stream activations through
          them in order:
        </p>
        <CodeBlock>{`prompt -> embed -> node0 (layers 0..k) -> node1 (k..2k) -> ... -> tail (final layers) -> sample -> next token`}</CodeBlock>
        <p>
          Each node holds only its block in VRAM, runs its block's forward pass,
          and ships the resulting hidden-state tensor to the next node. This is
          what makes it possible to serve a frontier-scale model on a mesh of
          consumer GPUs that individually could never load it.
        </p>

        <Figure caption="Contiguous layer blocks across machines. The head embeds token ids; middle blocks only forward hidden states; the tail produces logits.">
          <PipelineFlow />
        </Figure>

        <h2 id="wan">The WAN performance law</h2>
        <p>
          On the open internet the bottleneck is not raw compute - it is the
          network round-trip between hops. A naive pipeline pays a full
          round-trip per token per hop and crawls. Nuro inherits the set of
          techniques that make it fast anyway:
        </p>
        <ul>
          <li>
            <strong>Speculative decoding</strong> - a small draft model proposes
            several tokens that the pipeline verifies in one pass.
          </li>
          <li>
            <strong>Asynchronous pipelining</strong> - multiple tokens in flight
            across the ring at once, so hops overlap instead of blocking.
          </li>
          <li>
            <strong>Direct-return ring</strong> - the tail returns the sampled
            token to the head directly, saving a full traversal.
          </li>
          <li>
            <strong>In-region clustering</strong> - nodes that are close in
            latency are grouped so per-hop cost stays small.
          </li>
        </ul>

        <Callout tone="info" title="Round-trip is the unit">
          The scheduler reasons in milliseconds of measured round-trip time, not
          teraflops. Pairwise RTT is measured at the application level over the
          same kind of persistent TCP connection the pipeline holds open during
          decode - not an ICMP ping - so the number reflects real per-hop
          activation cost.
        </Callout>

        <h2 id="runtime">The ModelRuntime interface</h2>
        <p>
          The engine is model-agnostic. Each node implements a small runtime
          contract for its assigned block:
        </p>
        <ul>
          <li>
            The <strong>head</strong> stage embeds token ids into hidden states.
          </li>
          <li>
            <strong>Middle</strong> stages take hidden states in and forward
            hidden states out - they never touch token ids.
          </li>
          <li>
            The <strong>tail</strong> stage applies the final norm and language
            head, returning logits to sample from.
          </li>
          <li>
            An <code>is_trusted</code> flag marks a node's trust tier so the
            scheduler can pin the leaky boundary blocks (embed and final layers)
            to trusted nodes and keep the privacy receipt's assumptions honest.
          </li>
        </ul>

        <h2 id="trust">Trust tiers and placement</h2>
        <p>
          Not every node is equal. A node's trust tier - <code>operator</code>,{" "}
          <code>staked</code>, or <code>volunteer</code> - decides where it can
          sit in the pipeline. The embedding and final layers are the leakiest
          positions, so they are pinned to trusted nodes; untrusted volunteers
          only ever run middle blocks, and (with obfuscation on) only ever see
          rotated activations.
        </p>

        <h2 id="numbers">Measured throughput</h2>
        <StatGrid
          items={[
            { value: "18-25 tok/s", label: "Prior-work throughput on four clustered consumer GPUs over WAN", accent: true },
            { value: "no full model", label: "Each node holds only its contiguous block in VRAM", accent: false },
            { value: "256 MiB", label: "Default maximum activation frame on the wire", accent: false },
          ]}
        />
        <Callout tone="neutral" title="Where speed sits in the plan">
          Correctness comes first, then real WAN, then the KV cache, then the
          privacy proof. Heavier speed optimizations and the permissionless
          economy come after the network can prove the two things its name
          promises: the output is right, and the input stayed hidden.
        </Callout>
      </div>
    </DocsLayout>
  );
}
