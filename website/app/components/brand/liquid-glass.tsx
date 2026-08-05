/**
 * Living liquid-glass material system.
 *
 * A dependency-free approximation of molten glass / liquid chrome built from
 * layered SVG gradients, specular highlights and an animated turbulence +
 * displacement filter that makes forms slowly "flow" like a viscous fluid.
 *
 * Palette is low-saturation; edge colour comes from *reflection* gradients, not
 * emitted light. All motion loops slowly (12-20s) and respects reduced-motion.
 *
 * `LiquidGlassDefs` is mounted ONCE (see root layout) so every shape below can
 * reference the shared gradient/filter ids without duplicating them.
 */

import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Shared defs - mounted once globally                                 */
/* ------------------------------------------------------------------ */

export function LiquidGlassDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* Chrome ramp - vertical. Sharp light/dark banding = reflective metal.
            Low saturation; violet + champagne only kiss the extremes. */}
        <linearGradient id="lgChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAF6FF" />
          <stop offset="15%" stopColor="#B4C8D2" />
          <stop offset="33%" stopColor="#3A454B" />
          <stop offset="50%" stopColor="#0B1015" />
          <stop offset="64%" stopColor="#44515A" />
          <stop offset="79%" stopColor="#C8D8E0" />
          <stop offset="90%" stopColor="#8FBBD8" />
          <stop offset="100%" stopColor="#D8C9FF" />
        </linearGradient>

        {/* Crystal fill - brighter, for solid blob volumes. */}
        <linearGradient id="lgCrystal" x1="0.15" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#F4FBFF" />
          <stop offset="26%" stopColor="#CFE2EC" />
          <stop offset="48%" stopColor="#7E93A0" />
          <stop offset="62%" stopColor="#2B343A" />
          <stop offset="82%" stopColor="#9FC4DC" />
          <stop offset="100%" stopColor="#E7DEFF" />
        </linearGradient>

        {/* Reflection rim - the only place brand colour concentrates. */}
        <linearGradient id="lgRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4F3FF" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#7ED6FF" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#D8C9FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFF2D5" stopOpacity="0.35" />
        </linearGradient>

        {/* Warm boundary tint (champagne) for exposed / edge nodes. */}
        <linearGradient id="lgWarm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7E8" />
          <stop offset="20%" stopColor="#E7D3B4" />
          <stop offset="42%" stopColor="#4A423A" />
          <stop offset="58%" stopColor="#0E0C0A" />
          <stop offset="78%" stopColor="#C9B99C" />
          <stop offset="100%" stopColor="#FFF2D5" />
        </linearGradient>

        {/* Soft specular hotspot. */}
        <radialGradient id="lgSpec" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Ambient reflection glow (never emitted - soft environment bounce). */}
        <radialGradient id="lgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ED6FF" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#5FA9FF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Living-liquid morph - slow flowing displacement. */}
        <filter id="lgMorph" x="-35%" y="-35%" width="170%" height="170%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.010"
            numOctaves="2"
            seed="7"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="18s"
              values="0.006 0.010;0.011 0.007;0.006 0.010"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Gentler morph for smaller marks. */}
        <filter id="lgMorphSoft" x="-35%" y="-35%" width="170%" height="170%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="4"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="14s"
              values="0.008 0.012;0.013 0.009;0.008 0.012"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="7"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter id="lgSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>

        <filter id="lgAmbient" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Liquid ribbon - a flowing chrome tube                               */
/* ------------------------------------------------------------------ */

export function LiquidRibbon({
  d,
  width = 46,
  morph = true,
  glow = true,
}: {
  d: string;
  width?: number;
  morph?: boolean;
  glow?: boolean;
}) {
  return (
    <g filter={morph ? "url(#lgMorph)" : undefined}>
      {glow ? (
        <path
          d={d}
          stroke="url(#lgGlow)"
          strokeWidth={width * 1.9}
          strokeLinecap="round"
          fill="none"
          filter="url(#lgAmbient)"
          opacity="0.8"
        />
      ) : null}
      {/* Body */}
      <path
        d={d}
        stroke="url(#lgChrome)"
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
      />
      {/* Reflection rim */}
      <path
        d={d}
        stroke="url(#lgRim)"
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
        opacity="0.22"
      />
      {/* Specular highlight (upper edge) */}
      <path
        d={d}
        stroke="#ffffff"
        strokeWidth={width * 0.14}
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
        transform={`translate(0 ${-width * 0.26})`}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Liquid logo mark - one continuous glass tube (quatrefoil)           */
/* ------------------------------------------------------------------ */

const QUATREFOIL =
  "M100 72 Q140 58 128 100 Q142 142 100 128 Q58 142 72 100 Q58 58 100 72 Z";

export function LiquidLogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d={QUATREFOIL} fill="url(#lgGlow)" filter="url(#lgAmbient)" opacity="0.9" />
      <g filter="url(#lgMorphSoft)">
        <path
          d={QUATREFOIL}
          stroke="url(#lgChrome)"
          strokeWidth="30"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={QUATREFOIL}
          stroke="url(#lgRim)"
          strokeWidth="30"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
        <path
          d={QUATREFOIL}
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
          transform="translate(0 -4)"
        />
      </g>
      <ellipse cx="82" cy="70" rx="16" ry="8" fill="url(#lgSpec)" opacity="0.8" transform="rotate(-28 82 70)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Liquid capsule - a solid glass volume (pipeline node)               */
/* ------------------------------------------------------------------ */

export function LiquidCapsule({
  cx,
  cy,
  rx = 46,
  ry = 46,
  warm = false,
}: {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  warm?: boolean;
}) {
  const fill = warm ? "url(#lgWarm)" : "url(#lgCrystal)";
  return (
    <g filter="url(#lgMorphSoft)">
      <ellipse cx={cx} cy={cy} rx={rx + 10} ry={ry + 10} fill="url(#lgGlow)" filter="url(#lgAmbient)" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="url(#lgRim)"
        strokeWidth="1.6"
        opacity="0.6"
      />
      {/* top specular */}
      <ellipse
        cx={cx - rx * 0.24}
        cy={cy - ry * 0.42}
        rx={rx * 0.42}
        ry={ry * 0.2}
        fill="url(#lgSpec)"
        opacity="0.85"
        transform={`rotate(-24 ${cx} ${cy})`}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Ambient background - forms entering from the edges, negative space  */
/* ------------------------------------------------------------------ */

type AmbientVariant = "hero" | "left" | "right" | "footer";

const AMBIENT_PATHS: Record<AmbientVariant, { d: string; width: number }[]> = {
  hero: [
    { d: "M760 -40 C 980 120, 900 320, 1120 400 S 1320 560, 1240 700", width: 60 },
    { d: "M980 40 C 1140 160, 1060 300, 1220 380", width: 26 },
  ],
  left: [
    { d: "M-80 120 C 160 60, 120 300, 340 240 S 560 120, 720 220", width: 44 },
  ],
  right: [
    { d: "M1280 120 C 1040 60, 1080 300, 860 240 S 640 120, 480 220", width: 44 },
  ],
  footer: [
    { d: "M-80 160 C 240 60, 520 260, 820 140 S 1180 40, 1360 180", width: 40 },
  ],
};

export function AmbientLiquid({
  variant = "hero",
  className = "",
  fit = "meet",
}: {
  variant?: AmbientVariant;
  className?: string;
  fit?: "meet" | "slice";
}) {
  const paths = AMBIENT_PATHS[variant];
  return (
    <svg
      viewBox="0 0 1200 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio={`xMidYMid ${fit}`}
      className={`pointer-events-none block h-full w-full ${className}`}
      aria-hidden="true"
    >
      {paths.map((p, i) => (
        <g key={i} className={i % 2 === 0 ? "liquid-a" : "liquid-b"} style={{ transformOrigin: "center" }}>
          <LiquidRibbon d={p.d} width={p.width} />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Liquid panel - an organic glass frame wrapping content              */
/* ------------------------------------------------------------------ */

export function LiquidPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* The frame itself */}
      <div className="glass-panel relative overflow-hidden rounded-[2.25rem] border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
