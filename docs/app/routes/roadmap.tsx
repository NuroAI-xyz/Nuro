import type { Route } from "./+types/roadmap";
import { DocsLayout } from "../components/layout/docs-shell";
import {
  DocHeader,
  Callout,
  Figure,
  DefTable,
} from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";
import { GateLadder } from "../components/brand/diagrams";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Roadmap - Nuro Docs" },
    {
      name: "description",
      content:
        "Where Nuro is and where it goes next: the engine gates, the on-chain contract roadmap, and the product path.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "now", text: "What is proven now", depth: 2 },
  { id: "engine", text: "Engine roadmap", depth: 2 },
  { id: "contracts", text: "Contract roadmap", depth: 2 },
  { id: "product", text: "Product roadmap", depth: 2 },
];

export default function Roadmap() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Resources"
        title="Roadmap"
        lead="Nuro advances by gate, not by promise. Here is what is proven today and the concrete steps between here and a permissionless, provably-private network."
      />

      <div className="prose-docs">
        <h2 id="now">What is proven now</h2>
        <Figure caption="Correctness (Gate A) and privacy obfuscation (Gate D) are proven on a CPU harness today. The WAN and cache gates connect them to a production swarm.">
          <GateLadder />
        </Figure>
        <ul>
          <li>
            <strong>Correctness (Gate A)</strong> - bit-identical split vs whole
            model, across two processes over the sealed wire.
          </li>
          <li>
            <strong>Privacy obfuscation (Gate D)</strong> - per-request signed
            permutation drops untrusted recovery from ~100% to ~0.3% with
            bit-identical output, on a mini model.
          </li>
          <li>
            <strong>Live product</strong> - single-node native and browser
            workers, metered by the orchestrator.
          </li>
        </ul>

        <h2 id="engine">Engine roadmap</h2>
        <DefTable
          rows={[
            { term: "Gate B - WAN", def: "Two machines across the real internet, first correctness receipt with genuine latency." },
            { term: "Gate C - Cache", def: "KV cache across the sharded pipeline for fast multi-token decode." },
            { term: "Gate D at scale", def: "The privacy receipt on production models over WAN, not just the CPU mini model." },
            { term: "Speed and scale", def: "Speculative decoding, asynchronous pipelining, MoE support, dynamic allocation." },
            { term: "Trustless verification", def: "Stronger attestation than self-reported receipts; verifiable compute." },
          ]}
        />

        <h2 id="contracts">Contract roadmap</h2>
        <ul>
          <li>
            <strong>Settlement contract</strong> - move the revenue split
            on-chain so worker, treasury, and staking allocations are enforced
            by code.
          </li>
          <li>
            <strong>Worker registry and slashing</strong> - on-chain identity
            and penalties for workers that fail their receipts.
          </li>
          <li>
            <strong>Governance</strong> - staker control over privacy thresholds
            and economic parameters.
          </li>
        </ul>

        <h2 id="product">Product roadmap</h2>
        <ul>
          <li>
            <strong>Swarm worker v2</strong> - layer-block workers join the
            pipeline; unlocks true sharded serving in production.
          </li>
          <li>
            <strong>Permissionless join</strong> - anyone can contribute a GPU
            and be scheduled by trust tier and locality.
          </li>
          <li>
            <strong>Live treasury and data</strong> - on-chain indexer wires the
            treasury dashboard and public aggregates to real numbers.
          </li>
        </ul>

        <Callout tone="warn" title="Sequencing rule">
          Correctness, then real WAN, then cache, then the privacy proof. The
          permissionless economy comes after the network can prove the output is
          right and the input stayed hidden - in that order, every time.
        </Callout>
      </div>
    </DocsLayout>
  );
}
