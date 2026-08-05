const stroke = "rgba(255,255,255,0.35)";
const accent = "rgba(126,214,255,0.55)";
const muted = "rgba(255,255,255,0.12)";

export function ContributedComputeIllustration() {
  return (
    <svg viewBox="0 0 520 160" fill="none" className="w-full" aria-hidden="true">
      {/* Requesters */}
      {[0, 1, 2].map((i) => (
        <g key={`req-${i}`} transform={`translate(${40 + i * 8}, ${48 + i * 12})`}>
          <circle cx="0" cy="0" r="14" stroke={stroke} strokeWidth="1.5" />
          <circle cx="0" cy="-5" r="5" stroke={stroke} strokeWidth="1.2" />
          <path d="M-8 12 Q0 6 8 12" stroke={stroke} strokeWidth="1.2" fill="none" />
        </g>
      ))}
      <text x="28" y="130" fill={muted} fontSize="10" letterSpacing="0.2em">
        REQUESTERS
      </text>

      {/* Lines to orchestrator */}
      <path d="M90 70 L170 80" stroke={accent} strokeWidth="1" opacity="0.6" />
      <path d="M98 82 L170 80" stroke={accent} strokeWidth="1" opacity="0.4" />
      <path d="M106 94 L170 80" stroke={accent} strokeWidth="1" opacity="0.3" />

      {/* Orchestrator */}
      <rect
        x="170"
        y="58"
        width="100"
        height="44"
        rx="10"
        stroke={accent}
        strokeWidth="1.5"
        fill="rgba(126,214,255,0.06)"
      />
      <text
        x="220"
        y="85"
        fill="rgba(212,243,255,0.7)"
        fontSize="10"
        textAnchor="middle"
        letterSpacing="0.18em"
      >
        ORCHESTRATOR
      </text>

      {/* Lines to workers */}
      <path d="M270 80 L350 68" stroke={accent} strokeWidth="1" opacity="0.6" />
      <path d="M270 80 L350 80" stroke={accent} strokeWidth="1" opacity="0.4" />
      <path d="M270 80 L350 92" stroke={accent} strokeWidth="1" opacity="0.3" />

      {/* Contributors / GPUs */}
      {[0, 1, 2].map((i) => (
        <g key={`gpu-${i}`} transform={`translate(${350 + i * 8}, ${56 + i * 12})`}>
          <rect x="-16" y="-12" width="32" height="24" rx="4" stroke={stroke} strokeWidth="1.5" />
          <path d="M-6 -4 H6 M-6 0 H6 M-6 4 H4" stroke={muted} strokeWidth="1" />
        </g>
      ))}
      <text x="350" y="130" fill={muted} fontSize="10" letterSpacing="0.2em">
        CONTRIBUTORS
      </text>
    </svg>
  );
}

export function PrivateIllustration() {
  return (
    <svg viewBox="0 0 360 120" fill="none" className="w-full" aria-hidden="true">
      <rect x="20" y="30" width="56" height="64" rx="6" stroke={stroke} strokeWidth="1.5" />
      <path d="M32 48 H64 M32 58 H58 M32 68 H52" stroke={muted} strokeWidth="1" />
      <text x="48" y="108" fill={muted} fontSize="9" textAnchor="middle" letterSpacing="0.15em">
        PROMPT
      </text>

      <path d="M88 62 H118" stroke={accent} strokeWidth="1" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill={accent} />
        </marker>
      </defs>

      <circle cx="148" cy="62" r="22" stroke={accent} strokeWidth="1.5" fill="rgba(126,214,255,0.05)" />
      <rect x="138" y="54" width="20" height="16" rx="3" stroke={accent} strokeWidth="1.2" />
      <path d="M148 66 V72" stroke={accent} strokeWidth="1.2" />
      <text x="148" y="108" fill={muted} fontSize="9" textAnchor="middle" letterSpacing="0.15em">
        EPHEMERAL
      </text>

      <path d="M178 62 H208" stroke={accent} strokeWidth="1" opacity="0.5" />

      <rect
        x="218"
        y="40"
        width="56"
        height="44"
        rx="6"
        stroke={stroke}
        strokeWidth="1.5"
        fill="rgba(255,255,255,0.03)"
      />
      <text x="246" y="58" fill={muted} fontSize="8" textAnchor="middle">
        tokens
      </text>
      <text x="246" y="72" fill={muted} fontSize="8" textAnchor="middle">
        only
      </text>
      <text x="246" y="108" fill={muted} fontSize="9" textAnchor="middle" letterSpacing="0.15em">
        METERING
      </text>
    </svg>
  );
}

export function BrowserIllustration() {
  return (
    <svg viewBox="0 0 360 140" fill="none" className="w-full" aria-hidden="true">
      <rect
        x="40"
        y="20"
        width="280"
        height="100"
        rx="10"
        stroke={stroke}
        strokeWidth="1.5"
        fill="rgba(255,255,255,0.02)"
      />
      <path d="M40 38 H320" stroke={muted} strokeWidth="1" />
      <circle cx="56" cy="29" r="3" fill="rgba(255,255,255,0.2)" />
      <circle cx="68" cy="29" r="3" fill="rgba(255,255,255,0.12)" />
      <circle cx="80" cy="29" r="3" fill="rgba(255,255,255,0.08)" />
      <rect x="60" y="52" width="120" height="8" rx="2" fill="rgba(126,214,255,0.15)" />
      <rect x="60" y="68" width="200" height="6" rx="2" fill={muted} />
      <rect x="60" y="80" width="160" height="6" rx="2" fill={muted} />
      <rect x="60" y="96" width="80" height="6" rx="2" fill={muted} />
      <rect
        x="220"
        y="52"
        width="72"
        height="52"
        rx="6"
        stroke={accent}
        strokeWidth="1"
        fill="rgba(126,214,255,0.04)"
      />
      <text x="256" y="82" fill="rgba(212,243,255,0.6)" fontSize="9" textAnchor="middle">
        WebGPU
      </text>
    </svg>
  );
}

export function EarnIllustration() {
  return (
    <svg viewBox="0 0 520 140" fill="none" className="w-full" aria-hidden="true">
      {[0, 1, 2].map((stack) => (
        <g key={stack} transform={`translate(${120 + stack * 100}, 0)`}>
          {[0, 1, 2].map((coin) => (
            <ellipse
              key={coin}
              cx="0"
              cy={95 - coin * 14}
              rx="28"
              ry="10"
              stroke={coin === 2 ? accent : stroke}
              strokeWidth="1.5"
              fill={coin === 2 ? "rgba(126,214,255,0.08)" : "rgba(255,255,255,0.02)"}
            />
          ))}
          <text
            x="0"
            y={95 - 28}
            fill={stack === 1 ? "rgba(212,243,255,0.8)" : muted}
            fontSize="11"
            textAnchor="middle"
            fontWeight="500"
          >
            USDC
          </text>
        </g>
      ))}
      <path
        d="M60 120 H460"
        stroke={muted}
        strokeWidth="1"
        strokeDasharray="4 6"
      />
      <text x="260" y="132" fill={muted} fontSize="9" textAnchor="middle" letterSpacing="0.2em">
        PER INFERENCE JOB
      </text>
    </svg>
  );
}
