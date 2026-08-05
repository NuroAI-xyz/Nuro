import type { Route } from "./+types/how-it-works";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  Figure,
  StatGrid,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { ArchitectureDiagram, PipelineFlow } from "../components/brand/diagrams";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "How it works - Nuro Docs" },
    {
      name: "description",
      content:
        "The end-to-end path of a Nuro request: dispatch, sharded inference over a sealed wire, correctness and privacy receipts, and metered settlement.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "shape", text: "The shape of the network", depth: 2 },
  { id: "request", text: "Life of a request", depth: 2 },
  { id: "pipeline", text: "Inside the pipeline", depth: 2 },
  { id: "receipts", text: "Two receipts, not one", depth: 2 },
  { id: "today", text: "What runs today", depth: 2 },
];

export default function HowItWorks() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Getting started"
        title="How it works"
        lead="A request enters through an OpenAI-compatible endpoint, is dispatched to contributed GPUs, runs as a sharded pipeline over a sealed wire, and returns with receipts that a skeptic can re-check."
      />

      <div className="prose-docs">
        <h2 id="shape">The shape of the network</h2>
        <p>
          Nuro has four moving parts: the <strong>client</strong> that sends a
          prompt, the <strong>orchestrator</strong> that dispatches and meters
          work, the <strong>worker swarm</strong> that actually runs the model,
          and a public <strong>data layer</strong> that publishes aggregates
          with no prompt content in them.
        </p>

        <Figure caption="Client to orchestrator to worker swarm. Only token counts flow to the public data layer - never prompt or response content.">
          <ArchitectureDiagram />
        </Figure>

        <h2 id="request">Life of a request</h2>
        <ul>
          <li>
            <strong>Submit.</strong> A client calls the OpenAI-compatible API
            with a prompt. No account profile is attached to the content - the
            unit of account is the token, not your identity.
          </li>
          <li>
            <strong>Dispatch.</strong> The orchestrator selects workers, taking
            trust tier and locality into account so the leaky boundary layers
            land on trusted nodes.
          </li>
          <li>
            <strong>Run.</strong> The model runs as a pipeline: the trusted head
            embeds tokens, untrusted workers forward hidden states over the
            sealed wire, and the trusted tail produces logits and samples the
            next token.
          </li>
          <li>
            <strong>Receipt.</strong> The run emits a correctness receipt (and,
            as the privacy stack lands, a privacy receipt) that anyone can
            re-check.
          </li>
          <li>
            <strong>Settle.</strong> Workers are paid per job, but only against
            a valid receipt. Metering records token counts only.
          </li>
        </ul>

        <h2 id="pipeline">Inside the pipeline</h2>
        <p>
          A transformer is a stack of layers. Split the stack into contiguous
          blocks, put one block on each machine, and stream activations through
          them in order. Each node holds only its block in VRAM and never sees
          the whole model.
        </p>

        <Figure caption="The sharded pipeline. The head and tail are pinned to trusted nodes; the middle blocks run on untrusted, contributed GPUs.">
          <PipelineFlow />
        </Figure>

        <Callout tone="info" title="Why round-trips, not FLOPs">
          Over the open internet the scarce resource is the network round-trip,
          not raw compute. Nuro leans on speculative decoding, asynchronous
          pipelining, a direct-return ring, and in-region clustering to keep
          decode fast despite the hops. See{" "}
          <a href="/sharded-inference">Sharded inference</a>.
        </Callout>

        <h2 id="receipts">Two receipts, not one</h2>
        <p>
          Correctness and privacy are separate, independently checkable claims:
        </p>
        <ul>
          <li>
            <strong>Correctness receipt.</strong> Proves the split run produced
            the same output as the whole model would have - distinct nodes,
            real WAN latency, and an output hash. See{" "}
            <a href="/correctness">Correctness receipts</a>.
          </li>
          <li>
            <strong>Privacy receipt.</strong> Records the measured worst-case
            token recovery across untrusted nodes and whether it passed the
            declared threshold. See{" "}
            <a href="/privacy-receipts">Obfuscation and receipts</a>.
          </li>
        </ul>

        <h2 id="today">What runs today</h2>
        <StatGrid
          items={[
            { value: "Live", label: "Single-node workers (Ollama and in-browser WebGPU) metered by the orchestrator", accent: true },
            { value: "Proven", label: "Correctness (Gate A) and privacy obfuscation (Gate D) on a CPU proof harness", accent: false },
            { value: "Next", label: "Multi-machine WAN pipeline and the permissionless worker economy", accent: false },
          ]}
        />
        <Callout tone="neutral" title="Honest scope">
          The proof gates run today on small models on CPU in seconds. The
          production swarm engine (WAN pipeline, KV cache, permissionless join)
          is being built in the open along the sequencing rule: correctness
          first, then real WAN, then cache, then the privacy proof.
        </Callout>
      </div>
    </DocsLayout>
  );
}
