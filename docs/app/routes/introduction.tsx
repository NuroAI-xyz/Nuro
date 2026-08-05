import type { Route } from "./+types/introduction";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  CardGrid,
  InfoCard,
  StatGrid,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { PipelineFlow } from "../components/brand/diagrams";
import { Figure } from "../components/docs/primitives";
import { ShieldGlyph, MeshGlyph, UnlockGlyph } from "../components/brand/glyphs";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Introduction - Nuro Docs" },
    {
      name: "description",
      content:
        "Nuro is a private inference network: uncensored, decentralized, and the first built to prove your prompts stay private with a per-run receipt.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "what", text: "What is Nuro", depth: 2 },
  { id: "thesis", text: "The one-line thesis", depth: 2 },
  { id: "why", text: "Why it matters", depth: 2 },
  { id: "pillars", text: "The four pillars", depth: 2 },
  { id: "honesty", text: "The honesty rule", depth: 2 },
  { id: "next", text: "Where to go next", depth: 2 },
];

export default function Introduction() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Getting started"
        title="Private inference, actually proven"
        lead="Nuro is an uncensored, decentralized inference network powered by GPUs that people contribute, not rent - and it is the first network built to prove your prompts stay private, per run, to a skeptic."
      />

      <div className="prose-docs">
        <h2 id="what">What is Nuro</h2>
        <p>
          Nuro runs large language models across many machines that nobody
          centrally owns. A model too big for any single GPU is split into
          contiguous layer blocks, and each machine in the swarm runs only its
          block. Activations stream from one node to the next over a sealed
          wire until a token comes out the other end.
        </p>
        <p>
          That much - fast, correct, decentralized inference over the open
          internet - was already proven by prior work (<strong>Shard</strong>).
          Nuro inherits it and takes on the problem Shard left open:{" "}
          <strong>
            a node that runs your layer must decrypt to compute, so it sees the
            activations it processes and can reconstruct a large fraction of
            your prompt.
          </strong>{" "}
          Nuro turns that leak into a measured number, drives it down by
          construction, and puts it in a receipt.
        </p>

        <Figure caption="A prompt is embedded on a trusted head, streamed through untrusted worker blocks, and finalized on a trusted tail - no node holds the whole model.">
          <PipelineFlow />
        </Figure>

        <h2 id="thesis">The one-line thesis</h2>
        <Callout tone="info" title="Thesis">
          Shard proved a frontier model can be served across machines nobody
          owns, fast and correctly, with a receipt a skeptic can check. It also
          showed a node running your layer can reconstruct a large fraction of
          your tokens. <strong>Nuro's job is to turn that leak into a number,
          drive the number down by construction, and put it in a receipt.</strong>{" "}
          Privacy earns its word phase by phase, never on day one.
        </Callout>

        <h2 id="why">Why it matters</h2>
        <p>
          Every hosted AI provider asks you to trust a promise: that they will
          not log, train on, or hand over your prompts. Decentralizing the
          compute does not automatically fix this - it can make it worse,
          because now strangers run your layers. The industry answer so far has
          been the word "private" with nothing measurable behind it.
        </p>
        <p>
          Nuro treats privacy the way good systems treat correctness: as a{" "}
          <strong>measured, adversarial, per-run property</strong> with a
          reproducible number, not a marketing claim.
        </p>

        <StatGrid
          items={[
            { value: "~35-59%", label: "Prompt tokens a malicious node could recover in prior work - the number we exist to drive down", accent: false },
            { value: "0.3%", label: "Recovery on an untrusted node with per-request obfuscation, output bit-identical", accent: true },
            { value: "per run", label: "A privacy receipt proves a specific request, not a blanket promise", accent: false },
          ]}
        />

        <h2 id="pillars">The four pillars</h2>
        <CardGrid>
          <InfoCard icon={<ShieldGlyph />} title="Proven private">
            A reconstruction adversary measures how much of your prompt an
            untrusted node can recover. Defenses drive that number below a
            declared threshold, and a privacy receipt records it per run.
          </InfoCard>
          <InfoCard icon={<MeshGlyph />} title="Decentralized">
            Inference is sharded across contributed GPUs over the open internet.
            No node holds the whole model, and no single operator holds the
            network.
          </InfoCard>
          <InfoCard icon={<UnlockGlyph />} title="Uncensored">
            No policy gate sits between you and the model. You are billed in a
            token, not monitored by a profile - there is no prompt history to
            mine.
          </InfoCard>
          <InfoCard icon={<ShieldGlyph />} title="Receipt-backed">
            Both correctness and privacy ship as receipts a third party can
            re-check: distinct nodes, real WAN latency, an output hash, and the
            worst-case token recovery across untrusted nodes.
          </InfoCard>
        </CardGrid>

        <h2 id="honesty">The honesty rule</h2>
        <Callout tone="warn" title="Non-negotiable">
          "Private" earns its word phase by phase, never on day one. We publish
          the reconstruction number even while it is bad, and show it falling. A
          receipt proves a specific run was private to a measured degree - it is
          not a blanket guarantee, and we never present it as one.
        </Callout>

        <h2 id="next">Where to go next</h2>
        <ul>
          <li>
            <a href="/how-it-works">How it works</a> - the end-to-end path of a
            request, from prompt to receipt.
          </li>
          <li>
            <a href="/sharded-inference">Sharded inference</a> - how a model is
            split across machines and still runs fast.
          </li>
          <li>
            <a href="/adversary">The reconstruction adversary</a> - how we
            measure leakage, and <a href="/privacy-receipts">how we crush it</a>.
          </li>
          <li>
            <a href="/token">Token and economics</a> - what $NURO is and how
            real yield flows to workers and stakers.
          </li>
        </ul>
      </div>
    </DocsLayout>
  );
}
