/**
 * Dependency-free SVG charts styled to match the monospace/terminal dashboard:
 * thin axes, small mono tick labels, grayscale fills, hatched areas.
 */
import { shortDay } from "../lib/analytics";

const AXIS = "#3f3f46"; // zinc-700
const LABEL = "#71717a"; // zinc-500
const INK = "#e4e4e7"; // zinc-200

const VW = 720;
const PAD = { t: 14, r: 8, b: 22, l: 40 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function fmtTick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`;
  return String(Math.round(n * 10) / 10);
}

function xLabels(dates: string[]): { i: number; label: string }[] {
  if (dates.length === 0) return [];
  const idxs = [0, Math.floor(dates.length / 2), dates.length - 1];
  const seen = new Set<number>();
  return idxs
    .filter((i) => (seen.has(i) ? false : (seen.add(i), true)))
    .map((i) => ({ i, label: shortDay(dates[i]) }));
}

function Frame({
  height,
  max,
  dates,
  children,
}: {
  height: number;
  max: number;
  dates: string[];
  children: React.ReactNode;
}) {
  const plotTop = PAD.t;
  const plotBottom = height - PAD.b;
  return (
    <svg
      viewBox={`0 0 ${VW} ${height}`}
      className="w-full"
      style={{ height: "auto" }}
      preserveAspectRatio="none"
      role="img"
    >
      {/* y grid: 0, mid, max */}
      {[0, 0.5, 1].map((f) => {
        const y = plotBottom - f * (plotBottom - plotTop);
        return (
          <g key={f}>
            <line x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y} stroke={AXIS} strokeWidth={0.5} />
            <text
              x={PAD.l - 5}
              y={y + 3}
              textAnchor="end"
              fontSize={9}
              fill={LABEL}
              fontFamily="ui-monospace, monospace"
            >
              {fmtTick(max * f)}
            </text>
          </g>
        );
      })}
      {children}
      {/* x labels */}
      {xLabels(dates).map(({ i, label }) => {
        const x = PAD.l + (i / Math.max(1, dates.length - 1)) * (VW - PAD.l - PAD.r);
        const anchor = i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle";
        return (
          <text
            key={i}
            x={x}
            y={height - 6}
            textAnchor={anchor}
            fontSize={9}
            fill={LABEL}
            fontFamily="ui-monospace, monospace"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function StackedBars({
  data,
  height = 190,
}: {
  data: { date: string; native: number; browser: number }[];
  height?: number;
}) {
  const dates = data.map((d) => d.date);
  const max = niceMax(Math.max(1, ...data.map((d) => d.native + d.browser)));
  const plotTop = PAD.t;
  const plotBottom = height - PAD.b;
  const plotW = VW - PAD.l - PAD.r;
  const n = data.length;
  const slot = plotW / n;
  const bw = Math.max(1.5, slot * 0.62);
  const scale = (v: number) => (v / max) * (plotBottom - plotTop);

  return (
    <Frame height={height} max={max} dates={dates}>
      {data.map((d, i) => {
        const cx = PAD.l + i * slot + slot / 2;
        const x = cx - bw / 2;
        const hNative = scale(d.native);
        const hBrowser = scale(d.browser);
        const yNative = plotBottom - hNative;
        const yBrowser = yNative - hBrowser;
        return (
          <g key={d.date}>
            {hNative > 0 && (
              <rect x={x} y={yNative} width={bw} height={hNative} fill="#d4d4d8" />
            )}
            {hBrowser > 0 && (
              <rect x={x} y={yBrowser} width={bw} height={hBrowser} fill="#52525b" />
            )}
          </g>
        );
      })}
    </Frame>
  );
}

export function AreaChart({
  data,
  height = 190,
  hatchId,
}: {
  data: { date: string; value: number }[];
  height?: number;
  hatchId: string;
}) {
  const dates = data.map((d) => d.date);
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const plotTop = PAD.t;
  const plotBottom = height - PAD.b;
  const plotW = VW - PAD.l - PAD.r;
  const px = (i: number) => PAD.l + (i / Math.max(1, data.length - 1)) * plotW;
  const py = (v: number) => plotBottom - (v / max) * (plotBottom - plotTop);
  const line = data.map((d, i) => `${px(i)},${py(d.value)}`).join(" ");
  const area = `${PAD.l},${plotBottom} ${line} ${px(data.length - 1)},${plotBottom}`;

  return (
    <Frame height={height} max={max} dates={dates}>
      <defs>
        <pattern id={hatchId} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={4} stroke={INK} strokeWidth={0.6} opacity={0.5} />
        </pattern>
      </defs>
      <polygon points={area} fill={`url(#${hatchId})`} />
      <polyline points={line} fill="none" stroke={INK} strokeWidth={1.2} />
    </Frame>
  );
}

export function LineChart({
  data,
  height = 190,
  step = false,
}: {
  data: { date: string; value: number }[];
  height?: number;
  step?: boolean;
}) {
  const dates = data.map((d) => d.date);
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const plotTop = PAD.t;
  const plotBottom = height - PAD.b;
  const plotW = VW - PAD.l - PAD.r;
  const px = (i: number) => PAD.l + (i / Math.max(1, data.length - 1)) * plotW;
  const py = (v: number) => plotBottom - (v / max) * (plotBottom - plotTop);

  let d = "";
  data.forEach((pt, i) => {
    const x = px(i);
    const y = py(pt.value);
    if (i === 0) d = `M ${x} ${y}`;
    else if (step) d += ` H ${x} V ${y}`;
    else d += ` L ${x} ${y}`;
  });

  return (
    <Frame height={height} max={max} dates={dates}>
      <path d={d} fill="none" stroke={INK} strokeWidth={1.2} />
    </Frame>
  );
}

export function Bars({
  data,
  height = 190,
}: {
  data: { date: string; value: number }[];
  height?: number;
}) {
  const dates = data.map((d) => d.date);
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const plotTop = PAD.t;
  const plotBottom = height - PAD.b;
  const plotW = VW - PAD.l - PAD.r;
  const slot = plotW / data.length;
  const bw = Math.max(1.5, slot * 0.62);
  return (
    <Frame height={height} max={max} dates={dates}>
      {data.map((d, i) => {
        const cx = PAD.l + i * slot + slot / 2;
        const h = (d.value / max) * (plotBottom - plotTop);
        return (
          <rect
            key={d.date}
            x={cx - bw / 2}
            y={plotBottom - h}
            width={bw}
            height={h}
            fill="#d4d4d8"
          />
        );
      })}
    </Frame>
  );
}
