import type { Route } from "./+types/sealed-wire";
import { DocsLayout } from "../components/layout/docs-shell";
import { DocHeader, Callout, CodeBlock } from "../components/docs/primitives";
import type { TocItem } from "../components/util/toc";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "The sealed wire - Nuro Docs" },
    {
      name: "description",
      content:
        "How Nuro secures the path between nodes with authenticated encryption and a pickle-free frame - and why that is not the same as endpoint privacy.",
    },
  ];
}

const toc: TocItem[] = [
  { id: "purpose", text: "What the wire fixes", depth: 2 },
  { id: "frame", text: "The frame format", depth: 2 },
  { id: "crypto", text: "Authenticated encryption", depth: 2 },
  { id: "notfix", text: "What it does not fix", depth: 2 },
];

export default function SealedWire() {
  return (
    <DocsLayout toc={toc}>
      <DocHeader
        eyebrow="Architecture"
        title="The sealed wire"
        lead="Activations travelling between nodes are framed without pickle and sealed with authenticated encryption. This secures the path - but deliberately not the endpoints."
      />

      <div className="prose-docs">
        <h2 id="purpose">What the wire fixes</h2>
        <p>
          When hidden states hop from one machine to the next, two classic
          failure modes have to be closed. First, code execution: naive tensor
          transport often relies on Python pickle, which is remote code
          execution waiting to happen. Second, eavesdropping: a passive observer
          on the network path should learn nothing from the bytes in flight.
        </p>
        <p>The sealed wire closes both.</p>

        <h2 id="frame">The frame format</h2>
        <p>
          A message is a typed frame, never a pickled object: a JSON header with
          control fields plus tensor dtype and shape, followed by the raw
          little-endian tensor bytes.
        </p>
        <CodeBlock>{`[ 4-byte length ][ JSON header ][ raw tensor bytes ]
                  |            |
                  |            +-- little-endian, dtype + shape from header
                  +-- control fields, tensor dtype, shape (no code, no pickle)`}</CodeBlock>
        <Callout tone="info" title="No pickle, ever">
          Because the payload is raw numbers described by a JSON header - not a
          serialized object graph - there is no code path that deserializes
          untrusted code. Frame size is capped (default 256 MiB via{" "}
          <code>NURO_MAX_FRAME</code>) so a malformed header cannot exhaust
          memory.
        </Callout>

        <h2 id="crypto">Authenticated encryption</h2>
        <p>
          Each frame is sealed with ChaCha20-Poly1305 under a pre-shared swarm
          key (<code>NURO_PSK</code>), with a fresh 96-bit nonce per frame.
          That gives confidentiality and integrity: a tampered or forged frame
          fails the authentication tag and is rejected.
        </p>
        <CodeBlock>{`seal(frame)   = ChaCha20-Poly1305(key = NURO_PSK, nonce = random96, header + tensor)
open(frame)   = verify tag, then decrypt   # reject on any mismatch`}</CodeBlock>

        <h2 id="notfix">What it does not fix</h2>
        <Callout tone="warn" title="The wire is not the endpoint">
          Sealing the wire protects activations from an observer <strong>on the
          path</strong>. It does nothing about the node at the <strong>end</strong>{" "}
          of that path: a participating node must decrypt to run its layer, so
          it necessarily sees the activations it processes. Reconstructing the
          prompt from those activations is a separate, harder problem.
        </Callout>
        <p>
          That endpoint problem is exactly what the Nuro privacy stack attacks.
          Continue to <a href="/adversary">The reconstruction adversary</a> to
          see how the leak is measured, then{" "}
          <a href="/privacy-receipts">Obfuscation and receipts</a> for how it is
          driven down.
        </p>
        <Callout tone="neutral" title="Roadmap">
          Today the wire uses a single pre-shared key for the swarm. Per-node
          identities keyed by worker tokens (a Noise or QUIC-TLS style handshake)
          are on the roadmap so each hop is mutually authenticated.
        </Callout>
      </div>
    </DocsLayout>
  );
}
