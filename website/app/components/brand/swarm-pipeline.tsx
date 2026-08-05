import { LiquidCapsule } from "./liquid-glass";

const NODES = [
  { label: "Entry", layers: "layers 0-15", warm: true },
  { label: "Node 2", layers: "layers 16-31", warm: false },
  { label: "Node 3", layers: "layers 32-47", warm: false },
  { label: "Exit", layers: "layers 48-63", warm: true },
];

/**
 * The shard pipeline rendered in liquid glass: layer blocks are crystal capsules
 * joined by flowing glass tubes. A soft specular highlight drifts through each
 * tube like liquid in motion. Boundary capsules carry a warm champagne tint to
 * mark where a prompt is most exposed.
 */
export function SwarmPipelineIllustration() {
  const cx = [150, 400, 650, 900];
  const cy = 118;
  const r = 46;

  return (
    <div className="overflow-x-auto pb-2">
      <svg
        viewBox="0 0 1050 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="min-w-[640px] md:min-w-0 md:w-full"
        role="img"
        aria-label="A prompt flows through four crystal layer-blocks joined by glass tubes; entry and exit blocks are the most exposed."
      >
        {/* Tubes between capsules (draw first, behind) */}
        {cx.slice(0, -1).map((x, i) => (
          <GlassTube key={`tube-${i}`} x1={x + r} x2={cx[i + 1] - r} y={cy} begin={i * 1.6} />
        ))}
        {/* Prompt in / output out stubs */}
        <GlassTube x1={64} x2={cx[0] - r} y={cy} begin={0} />
        <GlassTube x1={cx[3] + r} x2={986} y={cy} begin={2.4} />

        {/* Capsules */}
        {NODES.map((node, i) => (
          <LiquidCapsule key={node.label} cx={cx[i]} cy={cy} rx={r} ry={r} warm={node.warm} />
        ))}

        {/* End labels */}
        <text x="44" y={cy + 4} fill="#5c5c5c" fontSize="11" letterSpacing="0.14em">
          prompt
        </text>
        <text x="1006" y={cy + 4} fill="#5c5c5c" fontSize="11" letterSpacing="0.14em" textAnchor="end">
          output
        </text>

        {/* Node labels */}
        {NODES.map((node, i) => (
          <g key={`label-${node.label}`}>
            <text
              x={cx[i]}
              y={cy + r + 30}
              fill={node.warm ? "#F4E6C9" : "#ffffff"}
              fontSize="12.5"
              fontWeight="500"
              textAnchor="middle"
              letterSpacing="0.12em"
              style={{ textTransform: "uppercase" }}
            >
              {node.label}
            </text>
            <text
              x={cx[i]}
              y={cy + r + 48}
              fill="#5c5c5c"
              fontSize="10.5"
              textAnchor="middle"
              letterSpacing="0.08em"
            >
              {node.layers}
            </text>
            {node.warm ? (
              <text
                x={cx[i]}
                y={cy + r + 65}
                fill="#C9B99C"
                fontSize="9.5"
                textAnchor="middle"
                letterSpacing="0.18em"
                style={{ textTransform: "uppercase" }}
              >
                exposed
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** A short horizontal glass tube with a slow drifting internal highlight. */
function GlassTube({
  x1,
  x2,
  y,
  begin,
}: {
  x1: number;
  x2: number;
  y: number;
  begin: number;
}) {
  const d = `M${x1} ${y} L${x2} ${y}`;
  return (
    <g>
      <path d={d} stroke="url(#lgChrome)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path
        d={d}
        stroke="url(#lgRim)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <path
        d={d}
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
        transform="translate(0 -3.5)"
      />
      {/* Drifting internal reflection */}
      <ellipse rx="10" ry="4.5" fill="url(#lgSpec)" opacity="0.85">
        <animateMotion dur="7s" begin={`${begin}s`} repeatCount="indefinite" path={d} />
        <animate
          attributeName="opacity"
          values="0;0.9;0"
          dur="7s"
          begin={`${begin}s`}
          repeatCount="indefinite"
        />
      </ellipse>
    </g>
  );
}
