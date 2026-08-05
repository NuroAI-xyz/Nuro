import { GlassDefs, GlassWave } from "./glass-wave";
import { GlassRing } from "./glass-ring";
import { GlassRibbonImage } from "./glass-assets";

interface LivingGlassSceneProps {
  variant?: "hero" | "minimal" | "divider";
  className?: string;
}

export function LivingGlassScene({
  variant = "hero",
  className = "",
}: LivingGlassSceneProps) {
  if (variant === "minimal") {
    return (
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div className="absolute -right-[20%] top-[10%] w-[70%] animate-glass-drift opacity-40">
          <GlassWave variant="section" />
        </div>
      </div>
    );
  }

  if (variant === "divider") {
    return (
      <div
        className={`pointer-events-none relative h-32 overflow-hidden md:h-40 ${className}`}
        aria-hidden="true"
      >
        <div className="absolute -left-[15%] top-0 w-[130%] animate-ribbon-flow opacity-50">
          <GlassWave variant="footer" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <GlassRibbonImage className="absolute -right-[8%] top-[8%] w-[min(72vw,920px)] animate-glass-drift opacity-[0.55]" />
      <div className="absolute -left-[25%] top-[35%] w-[90%] animate-glass-drift-reverse opacity-35">
        <GlassWave variant="hero" />
      </div>
      <GlassRing
        className="absolute -right-24 top-[42%] hidden opacity-30 lg:block animate-glass-breathe"
        size={360}
      />
      <svg
        className="absolute bottom-[8%] left-[4%] h-48 w-48 opacity-20 animate-glass-breathe md:h-64 md:w-64"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <GlassDefs />
        <path
          d="M40 100 C 60 40, 140 40, 160 100 S 60 160, 40 100"
          stroke="url(#glassStroke)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function GlassTubesIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-w-md ${className}`}
      aria-hidden="true"
    >
      <GlassDefs />
      <path
        d="M30 280 C 90 180, 170 300, 240 200 S 390 80, 450 160"
        stroke="url(#glassStroke)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
        className="animate-glass-breathe"
      />
      <path
        d="M60 90 C 130 150, 210 40, 290 120 S 380 260, 440 190"
        stroke="url(#glassStroke)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
      <ellipse
        cx="240"
        cy="180"
        rx="70"
        ry="48"
        stroke="url(#glassStroke)"
        strokeWidth="4"
        fill="url(#glassFill)"
        opacity="0.4"
        className="animate-glass-drift"
        style={{ transformOrigin: "240px 180px" }}
      />
    </svg>
  );
}
