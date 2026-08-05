import { AmbientLiquid } from "./liquid-glass";

/**
 * Hero backdrop: a large liquid-glass ribbon entering from the right edge, with
 * generous black negative space on the left for the headline. Drifts slowly.
 */
export function HeroVisual() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Ribbon enters from the right, continues beyond the canvas */}
      <div className="ambient-fade absolute inset-0">
        <AmbientLiquid variant="hero" fit="slice" />
      </div>

      {/* Legibility scrims - keep the copy column pure black */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent md:via-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
    </div>
  );
}
