import { GlassDefs } from "./glass-wave";

interface GlassRingProps {
  className?: string;
  size?: number;
}

export function GlassRing({ className = "", size = 420 }: GlassRingProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 420 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <GlassDefs />
      <circle
        cx="210"
        cy="210"
        r="160"
        stroke="url(#glassStroke)"
        strokeWidth="2.5"
        fill="none"
        opacity="0.35"
        strokeDasharray="12 18"
        className="animate-ring-slow origin-center"
        style={{ transformOrigin: "210px 210px" }}
      />
      <ellipse
        cx="210"
        cy="210"
        rx="120"
        ry="88"
        stroke="url(#glassStroke)"
        strokeWidth="8"
        fill="none"
        opacity="0.14"
        transform="rotate(-18 210 210)"
        className="animate-glass-breathe"
      />
      <circle cx="210" cy="210" r="90" fill="url(#glassGlow)" />
    </svg>
  );
}
