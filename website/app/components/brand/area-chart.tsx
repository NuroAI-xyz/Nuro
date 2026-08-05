import { useId } from "react";

interface AreaChartProps {
  /** Series values (evenly spaced along x). */
  data: number[];
  /** Stroke + gradient base colour. */
  color?: string;
  className?: string;
  ariaLabel?: string;
}

const W = 600;
const H = 200;
const PAD = 4;

/** Catmull-Rom → cubic bezier for a smooth line + filled area to the baseline. */
function buildPaths(data: number[]) {
  if (data.length < 2) return { line: "", area: "" };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / (data.length - 1);

  const pts = data.map((v, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (H - PAD * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });

  let line = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    line += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  const last = pts[pts.length - 1];
  const area = `${line} L ${last[0].toFixed(2)} ${H} L ${pts[0][0].toFixed(2)} ${H} Z`;
  return { line, area };
}

/**
 * Dependency-free responsive area chart (gradient fill + smooth line), styled to
 * match the Nuro glass aesthetic. Stretches to its container width/height.
 */
export function AreaChart({
  data,
  color = "#7ED6FF",
  className = "",
  ariaLabel,
}: AreaChartProps) {
  const uid = useId().replace(/[:]/g, "");
  const { line, area } = buildPaths(data);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="55%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#area-${uid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
