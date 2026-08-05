import { AmbientLiquid } from "./liquid-glass";

/**
 * Hero backdrop: a hall of glowing monitors (the "GPU" fleet) as the underlying
 * photo, colorized toward the brand glass-cyan/blue by a tint layer, with the
 * liquid-glass ribbon on top and generous black negative space on the left for
 * the headline.
 */
export function HeroVisual() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Underlying photo: a hall of monitors standing in for the GPU fleet */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.55]"
        style={{ backgroundImage: "url('/hero-gpus.png')" }}
      />

      {/* Brand tint layer - colorizes the b/w photo toward glass-cyan/blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-glass-cyan/45 via-glass-blue/30 to-transparent mix-blend-color" />
      <div className="absolute inset-0 bg-glass-blue/15 mix-blend-overlay" />

      {/* Ribbon enters from the right, continues beyond the canvas */}
      <div className="ambient-fade absolute inset-0">
        <AmbientLiquid variant="hero" fit="slice" />
      </div>

      {/* Legibility scrims - keep the copy column pure black */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent md:via-black/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />
    </div>
  );
}
