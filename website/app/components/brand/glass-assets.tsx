interface GlassRibbonImageProps {
  className?: string;
  opacity?: number;
}

export function GlassRibbonImage({
  className = "",
  opacity = 0.72,
}: GlassRibbonImageProps) {
  return (
    <img
      src="/warm_curvy.png"
      alt=""
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
      draggable={false}
    />
  );
}
