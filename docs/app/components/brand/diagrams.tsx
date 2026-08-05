/**
 * Custom SVG illustrations + flowcharts for the docs, drawn in the Nuro
 * liquid-glass palette. All are responsive (viewBox + w-full) and lean on the
 * shared animation classes in app.css (animate-dash, animate-float).
 */

const CYAN = "#7ED6FF";
const ICE = "#D4F3FF";
const WARM = "#FFE7A8";
const GREEN = "#4ADE80";
const MUTED = "#8a8a8a";

/* --------------------------------------------------------------------- */
/* Shared node primitive                                                 */
/* --------------------------------------------------------------------- */

type Num = number | string;

function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone = "neutral",
}: {
  x: Num;
  y: Num;
  w: Num;
  h: Num;
  title: string;
  sub?: string;
  tone?: "trusted" | "untrusted" | "neutral";
}) {
  const nx = Number(x);
  const ny = Number(y);
  const nw = Number(w);
  const nh = Number(h);
  const stroke =
    tone === "trusted" ? CYAN : tone === "untrusted" ? WARM : "rgba(255,255,255,0.22)";
  const fill =
    tone === "trusted"
      ? "rgba(126,214,255,0.06)"
      : tone === "untrusted"
        ? "rgba(255,231,168,0.05)"
        : "rgba(255,255,255,0.02)";
  return (
    <g>
      <rect
        x={nx}
        y={ny}
        width={nw}
        height={nh}
        rx="12"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      <text
        x={nx + nw / 2}
        y={sub ? ny + nh / 2 - 4 : ny + nh / 2 + 4}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="13"
        fontWeight="600"
      >
        {title}
      </text>
      {sub && (
        <text
          x={nx + nw / 2}
          y={ny + nh / 2 + 13}
          textAnchor="middle"
          fill={MUTED}
          fontSize="10.5"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ x1, x2, y }: { x1: Num; x2: Num; y: Num }) {
  const a = Number(x1);
  const b = Number(x2);
  const c = Number(y);
  return (
    <g>
      <line
        x1={a}
        y1={c}
        x2={b - 7}
        y2={c}
        stroke={CYAN}
        strokeWidth="1.6"
        className="animate-dash"
        opacity="0.9"
      />
      <path
        d={`M${b - 8} ${c - 4} L${b} ${c} L${b - 8} ${c + 4}`}
        fill="none"
        stroke={CYAN}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/* --------------------------------------------------------------------- */
/* 1. Sharded pipeline flow                                              */
/* --------------------------------------------------------------------- */

export function PipelineFlow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 200" className={`h-auto w-full ${className}`} role="img"
      aria-label="Sharded pipeline: prompt flows through embed, worker blocks, and tail to produce a token">
      <text x="0" y="20" fill={MUTED} fontSize="11" letterSpacing="1.5">
        SEALED WIRE - ACTIVATIONS ONLY, NO NODE HOLDS THE WHOLE MODEL
      </text>

      <Box x="0" y="66" w="96" h="56" title="Prompt" sub="tokens" tone="trusted" />
      <Box x="132" y="66" w="96" h="56" title="Embed / head" sub="layers 0-k" tone="trusted" />
      <Box x="264" y="66" w="104" h="56" title="Worker A" sub="layers k-2k" tone="untrusted" />
      <Box x="404" y="66" w="104" h="56" title="Worker B" sub="layers 2k-3k" tone="untrusted" />
      <Box x="544" y="66" w="96" h="56" title="Tail" sub="final + logits" tone="trusted" />
      <Box x="676" y="66" w="84" h="56" title="Token" sub="sampled" tone="trusted" />

      <Arrow x1={96} x2={132} y={94} />
      <Arrow x1={228} x2={264} y={94} />
      <Arrow x1={368} x2={404} y={94} />
      <Arrow x1={508} x2={544} y={94} />
      <Arrow x1={640} x2={676} y={94} />

      {/* legend */}
      <circle cx="8" cy="164" r="5" fill="none" stroke={CYAN} strokeWidth="1.4" />
      <text x="20" y="168" fill={MUTED} fontSize="11">Trusted node (pinned)</text>
      <circle cx="220" cy="164" r="5" fill="none" stroke={WARM} strokeWidth="1.4" />
      <text x="232" y="168" fill={MUTED} fontSize="11">Untrusted node (sees only rotated activations)</text>
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* 2. Obfuscation: signed permutation + conjugated weights               */
/* --------------------------------------------------------------------- */

export function ObfuscationDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 260" className={`h-auto w-full ${className}`} role="img"
      aria-label="Per-request secret rotation applied by the trusted head, undone by the trusted tail; the untrusted middle runs conjugated weights">
      <Box x="0" y="60" w="150" h="70" title="Trusted head" tone="trusted" />
      <text x="75" y="150" textAnchor="middle" fill={ICE} fontSize="11">applies secret R</text>

      <Box x="305" y="60" w="150" h="70" title="Untrusted worker" tone="untrusted" />
      <text x="380" y="150" textAnchor="middle" fill={WARM} fontSize="11">holds W' = W R</text>
      <text x="380" y="165" textAnchor="middle" fill={MUTED} fontSize="10">never sees R</text>

      <Box x="610" y="60" w="150" h="70" title="Trusted tail" tone="trusted" />
      <text x="685" y="150" textAnchor="middle" fill={ICE} fontSize="11">undoes R</text>

      <Arrow x1={150} x2={305} y={95} />
      <Arrow x1={455} x2={610} y={95} />

      <text x="227" y="52" textAnchor="middle" fill={MUTED} fontSize="10.5">rotated residual</text>
      <text x="532" y="52" textAnchor="middle" fill={MUTED} fontSize="10.5">rotated residual</text>

      {/* adversary readout */}
      <rect x="255" y="196" width="250" height="52" rx="12" fill="rgba(74,222,128,0.06)" stroke="rgba(74,222,128,0.3)" strokeWidth="1.3" />
      <text x="380" y="220" textAnchor="middle" fill={GREEN} fontSize="12" fontWeight="600">
        Adversary recovery: 100% - 0.3%
      </text>
      <text x="380" y="237" textAnchor="middle" fill={MUTED} fontSize="10.5">
        RMSNorm-invariant, so output stays bit-identical
      </text>
      <path d="M380 130 L380 196" stroke={GREEN} strokeWidth="1.4" strokeDasharray="3 4" />
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* 3. Leakage bar - baseline vs threshold vs obfuscated                  */
/* --------------------------------------------------------------------- */

export function LeakageBar({ className = "" }: { className?: string }) {
  const rows = [
    { label: "Shard baseline (untrusted node)", pct: 59, color: WARM, value: "~35-59%" },
    { label: "Receipt threshold (pass line)", pct: 10, color: CYAN, value: "10%" },
    { label: "With per-request obfuscation", pct: 0.3, color: GREEN, value: "0.3%" },
  ];
  const W = 760;
  const barX = 250;
  const barW = 440;
  return (
    <svg viewBox="0 0 760 190" className={`h-auto w-full ${className}`} role="img"
      aria-label="Token recovery: baseline 35 to 59 percent, threshold 10 percent, obfuscated 0.3 percent">
      {rows.map((r, i) => {
        const y = 30 + i * 56;
        const w = Math.max((r.pct / 59) * barW, 3);
        return (
          <g key={r.label}>
            <text x="0" y={y + 15} fill="#c9c9c9" fontSize="12">{r.label}</text>
            <rect x={barX} y={y} width={barW} height="22" rx="6" fill="rgba(255,255,255,0.04)" />
            <rect x={barX} y={y} width={w} height="22" rx="6" fill={r.color} opacity="0.85" />
            <text x={barX + w + 10} y={y + 16} fill={r.color} fontSize="12" fontWeight="600">
              {r.value}
            </text>
          </g>
        );
      })}
      <text x="0" y="180" fill={MUTED} fontSize="10.5">
        Fraction of input tokens a decrypting node can reconstruct from activations it processes.
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* 4. Network architecture                                               */
/* --------------------------------------------------------------------- */

export function ArchitectureDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 320" className={`h-auto w-full ${className}`} role="img"
      aria-label="Client to orchestrator to worker swarm, with metering to the public data layer">
      <Box x="0" y="130" w="120" h="60" title="Client" sub="OpenAI-compatible" tone="trusted" />

      <Box x="230" y="130" w="140" h="60" title="Orchestrator" sub="dispatch + metering" tone="neutral" />

      {/* worker swarm */}
      <Box x="520" y="30" w="150" h="52" title="Native worker" sub="Ollama GPU" tone="untrusted" />
      <Box x="520" y="134" w="150" h="52" title="Browser worker" sub="WebGPU / WebLLM" tone="untrusted" />
      <Box x="520" y="238" w="150" h="52" title="Swarm block" sub="one layer range" tone="untrusted" />

      <Box x="230" y="250" w="140" h="52" title="Data layer" sub="public aggregates" tone="neutral" />

      <Arrow x1={120} x2={230} y={160} />
      {/* orchestrator to workers */}
      <path d="M370 150 C 450 120, 460 70, 520 58" fill="none" stroke={CYAN} strokeWidth="1.6" className="animate-dash" />
      <path d="M370 160 L520 160" fill="none" stroke={CYAN} strokeWidth="1.6" className="animate-dash" />
      <path d="M370 172 C 450 210, 460 250, 520 262" fill="none" stroke={CYAN} strokeWidth="1.6" className="animate-dash" />
      {/* metering down to data */}
      <path d="M300 190 L300 250" fill="none" stroke={MUTED} strokeWidth="1.4" strokeDasharray="3 4" />
      <text x="312" y="228" fill={MUTED} fontSize="10.5">token counts only</text>

      <text x="60" y="215" textAnchor="middle" fill={MUTED} fontSize="10.5">prompt</text>
      <text x="700" y="20" textAnchor="middle" fill={MUTED} fontSize="10.5">receipts</text>
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* 5. Money flow - revenue split + treasury                              */
/* --------------------------------------------------------------------- */

export function MoneyFlow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 300" className={`h-auto w-full ${className}`} role="img"
      aria-label="Inference revenue splits to workers, treasury, and stakers; treasury buys back and burns while paying USDC yield">
      <Box x="0" y="120" w="150" h="64" title="Inference revenue" sub="paid per job" tone="trusted" />

      <Box x="300" y="20" w="150" h="56" title="GPU workers" sub="~60%" tone="untrusted" />
      <Box x="300" y="122" w="150" h="56" title="Treasury" sub="~30%" tone="neutral" />
      <Box x="300" y="224" w="150" h="56" title="Staking pool" sub="~10%" tone="trusted" />

      <Box x="600" y="94" w="160" h="52" title="Buy back + burn" sub="50% of treasury" tone="neutral" />
      <Box x="600" y="176" w="160" h="52" title="USDC to stakers" sub="50% of treasury" tone="trusted" />

      <path d="M150 152 C 220 120, 240 60, 300 48" fill="none" stroke={CYAN} strokeWidth="1.6" className="animate-dash" />
      <path d="M150 152 L300 150" fill="none" stroke={CYAN} strokeWidth="1.6" className="animate-dash" />
      <path d="M150 152 C 220 184, 240 244, 300 252" fill="none" stroke={CYAN} strokeWidth="1.6" className="animate-dash" />

      <path d="M450 150 C 520 130, 540 122, 600 120" fill="none" stroke={GREEN} strokeWidth="1.6" className="animate-dash" />
      <path d="M450 150 C 520 175, 540 198, 600 202" fill="none" stroke={GREEN} strokeWidth="1.6" className="animate-dash" />

      <text x="700" y="290" textAnchor="middle" fill={MUTED} fontSize="10.5">
        receipt-gated payouts
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* 6. Gate ladder - A to D                                               */
/* --------------------------------------------------------------------- */

export function GateLadder({ className = "" }: { className?: string }) {
  const gates = [
    { g: "A", t: "Correctness", d: "token-identical split vs whole" },
    { g: "B", t: "Real WAN", d: "two machines, first receipt" },
    { g: "C", t: "KV cache", d: "decode at speed" },
    { g: "D", t: "Privacy", d: "adversary below threshold" },
  ];
  return (
    <svg viewBox="0 0 760 150" className={`h-auto w-full ${className}`} role="img"
      aria-label="Development gates A correctness, B WAN, C cache, D privacy">
      {gates.map((g, i) => {
        const x = i * 190;
        const done = i < 1 || g.g === "D"; // A proven, D proven on mini model
        const color = g.g === "D" ? CYAN : done ? GREEN : MUTED;
        return (
          <g key={g.g}>
            <rect x={x + 8} y="34" width="164" height="82" rx="14"
              fill="rgba(255,255,255,0.02)" stroke={color} strokeWidth="1.4" opacity={done ? 1 : 0.55} />
            <circle cx={x + 34} cy="60" r="14" fill="none" stroke={color} strokeWidth="1.6" />
            <text x={x + 34} y="65" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{g.g}</text>
            <text x={x + 56} y="58" fill="#fff" fontSize="13" fontWeight="600">{g.t}</text>
            <text x={x + 20} y="96" fill={MUTED} fontSize="10.5">{g.d}</text>
            {i < gates.length - 1 && (
              <line x1={x + 172} y1="75" x2={x + 198} y2="75" stroke={MUTED} strokeWidth="1.4" className="animate-dash" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
