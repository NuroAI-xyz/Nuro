import type { Route } from "./+types/workers";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  CodeBlock,
  DefTable,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Workers and earning - Nuro Docs" },
    {
      name: "description",
      content:
        "Run a native or browser worker, serve inference jobs, and earn per job - paid only against a valid receipt.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "classes", text: "Worker classes", depth: 2 },
  { id: "native", text: "Run a native worker", depth: 2 },
  { id: "browser", text: "Run a browser worker", depth: 2 },
  { id: "pay", text: "How you get paid", depth: 2 },
  { id: "gated", text: "Receipt-gated payouts", depth: 2 },
];

export default function Workers() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Network"
        title="Workers and earning"
        lead="Contribute a GPU to the swarm and earn per job. Native workers wrap a local model for maximum throughput; browser workers run in a tab with zero install."
      />

      <div className="prose-docs">
        <h2 id="classes">Worker classes</h2>
        <DefTable
          rows={[
            {
              term: "Native",
              def: "Wraps a local Ollama install (default a capable ~27B model), advertised to the network as nuro-max-27b. Highest throughput, highest per-job rate.",
            },
            {
              term: "Browser",
              def: "Runs a WebGPU model via WebLLM (for example a 7B advertised as nuro-browser-8b). Zero install, lower rate, instant onboarding.",
            },
            {
              term: "Swarm block (soon)",
              def: "Loads a single layer block and participates in a sharded pipeline. Activates when the swarm engine ships.",
            },
          ]}
        />

        <h2 id="native">Run a native worker</h2>
        <p>
          Install Ollama, pull a model, then start the worker. It opens a
          WebSocket to the orchestrator and begins accepting jobs.
        </p>
        <CodeBlock>{`# 1. install a model runtime and pull a model
ollama pull qwen2.5:27b

# 2. start the Nuro worker (connects to the orchestrator)
npx @nuroaixyz/worker \\
  --mode native \\
  --model qwen2.5:27b \\
  --token $NURO_WORKER_TOKEN`}</CodeBlock>
        <Callout tone="info" title="Worker tokens">
          A worker authenticates with a worker token issued from your account.
          The token also carries the worker class the orchestrator dispatches
          against.
        </Callout>

        <h2 id="browser">Run a browser worker</h2>
        <p>
          Open the earn page on a WebGPU-capable browser. The model loads into
          the tab and the machine becomes a worker for as long as the tab is
          open - nothing to install, nothing left behind when you close it.
        </p>
        <CodeBlock>{`# just open it in a WebGPU browser
https://nuroai.xyz/earn`}</CodeBlock>

        <h2 id="pay">How you get paid</h2>
        <p>
          Earnings are per job, based on the worker class and the completion
          size. Native jobs pay a base rate plus an amount per thousand
          completion tokens; browser jobs pay a smaller base plus a smaller
          per-token amount. The orchestrator records the amount for each job
          from token counts only.
        </p>
        <DefTable
          rows={[
            {
              term: "Native",
              def: "Roughly $0.10-$0.14 per job (base plus per-1k completion tokens).",
            },
            {
              term: "Browser",
              def: "Roughly $0.07 per job (smaller base plus per-1k completion tokens).",
            },
          ]}
        />

        <h2 id="gated">Receipt-gated payouts</h2>
        <Callout tone="warn" title="Paid for real, correct work">
          Worker payouts release only against a valid correctness and privacy
          receipt - the same receipt discipline that proves the network ran a
          job right and kept it private. Doing the work correctly is what earns
          the payout; there is no reward for a job that cannot produce a valid
          receipt. See <a href="/economics">Staking and treasury</a> for where
          the money comes from.
        </Callout>
      </div>
    </DocsLayout>
  );
}
