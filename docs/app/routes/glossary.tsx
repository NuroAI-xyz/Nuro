import type { Route } from "./+types/glossary";
import { DocsLayout } from "../components/layout/docs-shell";
import { DocHeader, DefTable } from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Glossary - Nuro Docs" },
    {
      name: "description",
      content: "Definitions for the core terms used across the Nuro docs.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "core", text: "Core concepts", depth: 2 },
  { id: "privacy", text: "Privacy terms", depth: 2 },
  { id: "network", text: "Network terms", depth: 2 },
];

export default function Glossary() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Resources"
        title="Glossary"
        lead="The vocabulary that shows up across these docs, in one place."
      />

      <div className="prose-docs">
        <h2 id="core">Core concepts</h2>
        <DefTable
          rows={[
            { term: "Shard", def: "The prior proven decentralized inference engine Nuro inherits from - correctness receipts and a fast WAN pipeline. Nuro owns the privacy problem Shard left open." },
            { term: "Sharded inference", def: "Splitting a model into contiguous layer blocks across machines so no single node holds the whole model." },
            { term: "Stage / block", def: "A contiguous range of transformer layers assigned to one worker." },
            { term: "ModelRuntime", def: "The model-agnostic, per-node interface for serving a block: head embeds, middle forwards hidden states, tail produces logits." },
            { term: "Sealed wire", def: "The framed, authenticated-encrypted channel between nodes: a JSON header plus raw tensor bytes, sealed with ChaCha20-Poly1305." },
          ]}
        />

        <h2 id="privacy">Privacy terms</h2>
        <DefTable
          rows={[
            { term: "Reconstruction adversary", def: "The attacker that maps the activations a node processes back to the user's input tokens. The metric is the fraction of tokens recovered." },
            { term: "Boundary pinning", def: "Keeping the embedding and final layers on trusted nodes. Necessary but, on its own, not sufficient." },
            { term: "Edge containment", def: "Ensuring raw token ids never leave the trusted head." },
            { term: "Activation obfuscation", def: "A per-request secret signed permutation of the hidden dimension that lets untrusted nodes compute in a scrambled basis via conjugated weights." },
            { term: "Privacy receipt", def: "The record of defenses, per-node recovery scores, the worst untrusted recovery, and whether it passed the declared threshold." },
            { term: "worst_untrusted_recovery", def: "The load-bearing receipt field: the maximum token recovery across all nodes not marked trusted." },
            { term: "Trust tier", def: "A node's trust level - operator, staked, or volunteer - which decides where it can sit in the pipeline." },
          ]}
        />

        <h2 id="network">Network terms</h2>
        <DefTable
          rows={[
            { term: "Orchestrator", def: "The control plane that authenticates, dispatches jobs, and meters token counts." },
            { term: "Worker class", def: "Native (local Ollama GPU) or browser (WebGPU / WebLLM). Swarm-block workers arrive with the v2 engine." },
            { term: "Single-node vs swarm", def: "v1 runs a full model on one worker; v2 runs a layer pipeline across many workers." },
            { term: "Gate", def: "A concrete, runnable check that must pass before the project advances: A correctness, B WAN, C cache, D privacy." },
            { term: "Receipt attestation", def: "The trust level of a receipt. Default is self-reported; verification checks internal consistency, not trusted hardware." },
            { term: "Real yield", def: "Rewards funded from actual paid inference revenue, not inflationary token emissions." },
          ]}
        />
      </div>
    </DocsLayout>
  );
}
