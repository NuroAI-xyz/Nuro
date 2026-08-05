import { GlassDefs } from "./glass-wave";

/**
 * Hero-only background: one anchored ribbon on mobile, a soft second layer on desktop.
 * Kept separate from LivingGlassScene so the hero stays calm and readable.
 */
export function HeroGlassBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Keeps headline readable on small screens */}
      <div className="absolute inset-0 bg-gradient-to-b from-black from-35% via-black/90 via-55% to-transparent to-85% md:from-25% md:via-45% md:to-70%" />

      {/* Primary ribbon - bottom edge, contained width */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] md:h-[48%]">
        <div className="absolute inset-x-0 bottom-0 translate-y-[18%] opacity-[0.28] md:translate-y-[8%] md:opacity-[0.38]">
          <HeroRibbon className="hero-glass-drift w-full" />
        </div>
      </div>

      {/* Desktop-only accent - enters from the right, stays off the copy column */}
      <div className="absolute -right-[6%] bottom-[6%] hidden w-[min(42vw,520px)] opacity-[0.22] md:block hero-glass-drift-slow">
        <HeroRibbon thin className="w-full" />
      </div>
    </div>
  );
}

function HeroRibbon({
  className = "",
  thin = false,
}: {
  className?: string;
  thin?: boolean;
}) {
  const stroke = thin ? 2 : 2.5;
  const glow = thin ? 6 : 8;

  return (
    <svg
      viewBox="0 0 1200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-auto max-w-none ${className}`}
    >
      <GlassDefs />
      <path
        d="M-40 150 C 180 90, 320 190, 520 130 S 880 70, 1120 120 S 1280 160, 1240 150"
        stroke="url(#glassStroke)"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M-40 150 C 180 90, 320 190, 520 130 S 880 70, 1120 120 S 1280 160, 1240 150"
        stroke="url(#glassStroke)"
        strokeWidth={glow}
        strokeLinecap="round"
        fill="none"
        opacity="0.1"
        transform="translate(0, 6)"
      />
      {!thin ? (
        <path
          d="M-40 150 C 180 90, 320 190, 520 130 S 880 70, 1120 120 L 1240 240 L -40 240 Z"
          fill="url(#glassFill)"
          opacity="0.2"
        />
      ) : null}
    </svg>
  );
}
