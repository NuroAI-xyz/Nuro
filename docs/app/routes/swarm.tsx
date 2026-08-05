import type { Route } from "./+types/swarm";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  Figure,
  CardGrid,
  InfoCard,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { ArchitectureDiagram } from "../components/brand/diagrams";
import { TerminalGlyph, BrowserGlyph, ApiGlyph, MeshGlyph } from "../components/brand/glyphs";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "The swarm - Nuro Docs" },
    {
      name: "description",
      content:
        "The four parts of the Nuro network: client, orchestrator, worker swarm, and the public data layer.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "parts", text: "Four parts", depth: 2 },
  { id: "orchestrator", text: "The orchestrator", depth: 2 },
  { id: "workers", text: "The workers", depth: 2 },
  { id: "data", text: "The data layer", depth: 2 },
  { id: "ephemeral", text: "Ephemeral by design", depth: 2 },
];

export default function Swarm() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Network"
        title="The swarm"
        lead="Nuro is a small control plane wrapped around a large, contributed pool of GPUs. The control plane dispatches and meters; the swarm does the work; a public data layer keeps everyone honest without exposing content."
      />

      <div className="prose-docs">
        <h2 id="parts">Four parts</h2>
        <Figure caption="Client, orchestrator, worker swarm, and data layer. Prompts flow right; only token counts flow down to the public aggregates.">
          <ArchitectureDiagram />
        </Figure>
        <CardGrid>
          <InfoCard icon={<ApiGlyph />} title="Client">
            Anything that speaks the OpenAI-compatible API - an app, a script,
            or a browser. It sends a prompt and gets a completion plus receipts.
          </InfoCard>
          <InfoCard icon={<MeshGlyph />} title="Orchestrator">
            The control plane: authentication, worker tokens, job dispatch, and
            metering. It decides which workers serve a job.
          </InfoCard>
          <InfoCard icon={<TerminalGlyph />} title="Worker swarm">
            Contributed GPUs that run the model - full model per node today,
            layer blocks in swarm mode next.
          </InfoCard>
          <InfoCard icon={<BrowserGlyph />} title="Data layer">
            A public dashboard of aggregates - inference volume, contributors,
            settlement - with no prompt or response content in it.
          </InfoCard>
        </CardGrid>

        <h2 id="orchestrator">The orchestrator</h2>
        <p>
          The orchestrator is a WebSocket control plane. Workers connect to it
          and register a class; clients submit jobs; the orchestrator matches
          them, tracks token counts for billing, and records earnings per job.
          It is where a node's placement is decided - and, as the privacy stack
          lands, where trust-tier placement for the boundary layers is enforced.
        </p>
        <Callout tone="info" title="Metering, not monitoring">
          The orchestrator records how many tokens a job used - not what the
          prompt said. Earnings are computed from job metadata, not content.
        </Callout>

        <h2 id="workers">The workers</h2>
        <p>
          A worker is a lightweight client that holds a persistent connection to
          the orchestrator and serves jobs. There are two classes today and a
          third on the way:
        </p>
        <ul>
          <li>
            <strong>Native worker</strong> - wraps a local Ollama install and
            advertises a larger model. Highest throughput and earnings.
          </li>
          <li>
            <strong>Browser worker</strong> - runs a WebGPU model (WebLLM) with
            zero install, straight from a tab.
          </li>
          <li>
            <strong>Swarm block</strong> - the v2 mode: a worker loads only an
            assigned layer block, receives activation tensors from the previous
            node, and forwards to the next. This activates once the swarm engine
            ships.
          </li>
        </ul>
        <p>
          Setup and payouts are covered in{" "}
          <a href="/workers">Workers and earning</a>.
        </p>

        <h2 id="data">The data layer</h2>
        <p>
          Trust in a private network is easier to give when the network's
          activity is public in aggregate. The data layer publishes volume,
          contributor counts, and settlement or treasury metrics - the shape of
          the network's health - while deliberately holding no prompt or
          response content.
        </p>

        <h2 id="ephemeral">Ephemeral by design</h2>
        <Callout tone="success" title="Nothing to retain">
          Jobs are ephemeral: once a job completes, the worker retains no prompt
          or response. There is no history to leak because there is no history
          kept. This is the operational half of the same promise the privacy
          receipt makes cryptographically.
        </Callout>
      </div>
    </DocsLayout>
  );
}
