export function GlassDefs() {
  return (
    <defs>
      <linearGradient id="glassStroke" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D4F3FF" stopOpacity="0.85" />
        <stop offset="35%" stopColor="#7ED6FF" stopOpacity="0.55" />
        <stop offset="65%" stopColor="#5FA9FF" stopOpacity="0.45" />
        <stop offset="85%" stopColor="#D8C9FF" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#FFF2D5" stopOpacity="0.25" />
      </linearGradient>
      <linearGradient id="glassFill" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
        <stop offset="50%" stopColor="#7ED6FF" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
      </linearGradient>
      <radialGradient id="glassGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#D4F3FF" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <filter id="glassSoft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

interface GlassWaveProps {
  className?: string;
  variant?: "hero" | "section" | "footer";
}

export function GlassWave({ className = "", variant = "section" }: GlassWaveProps) {
  const paths = {
    hero: "M-40 180 C 120 80, 280 260, 480 150 S 820 40, 1100 170 S 1380 300, 1600 120",
    section:
      "M-60 120 C 180 220, 360 20, 560 130 S 920 240, 1200 90 S 1500 10, 1700 140",
    footer:
      "M-80 90 C 140 180, 320 10, 520 100 S 880 190, 1160 70 S 1480 20, 1680 110",
  };

  return (
    <svg
      viewBox="0 0 1600 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none h-auto w-[140%] max-w-none ${className}`}
      aria-hidden="true"
    >
      <GlassDefs />
      <path
        d={paths[variant]}
        stroke="url(#glassStroke)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
        filter="url(#glassSoft)"
        className="animate-glass-breathe"
      />
      <path
        d={paths[variant]}
        stroke="url(#glassStroke)"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
        opacity="0.12"
        transform="translate(0, 8)"
      />
      <path
        d={`${paths[variant]} L 1700 320 L -100 320 Z`}
        fill="url(#glassFill)"
        opacity="0.35"
      />
    </svg>
  );
}
