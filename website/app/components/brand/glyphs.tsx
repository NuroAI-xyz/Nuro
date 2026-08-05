/**
 * Minimal line glyphs drawn in the liquid-glass reflection palette (they stroke
 * with the shared #lgRim gradient). Kept clean and small - no circuits, grids or
 * node-graphs - so they read as premium marks rather than tech clichés.
 */

interface GlyphProps {
  className?: string;
}

const STROKE = "url(#lgRim)";
const ICE = "#D4F3FF";

/** Shield with a pulsing lock core - proof / privacy. */
export function ShieldGlyph({ className = "" }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 4 L40 10 V24 C40 34 33 41 24 44 C15 41 8 34 8 24 V10 Z"
        stroke={STROKE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="18" y="22" width="12" height="10" rx="3" stroke={STROKE} strokeWidth="1.5" />
      <path d="M20 22 V19 A4 4 0 0 1 28 19 V22" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="24" cy="27" r="1.6" fill={ICE}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Two intertwined liquid rings - pooled swarms, decentralized. */
export function MeshGlyph({ className = "" }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <ellipse cx="19" cy="24" rx="12" ry="15" stroke={STROKE} strokeWidth="1.8" transform="rotate(-24 19 24)" />
      <ellipse cx="29" cy="24" rx="12" ry="15" stroke={STROKE} strokeWidth="1.8" transform="rotate(24 29 24)" />
      <circle cx="24" cy="24" r="2" fill={ICE}>
        <animate attributeName="opacity" values="0.4;1;0.4" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Open padlock - uncensored, no policy gate. */
export function UnlockGlyph({ className = "" }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="12" y="22" width="24" height="18" rx="4" stroke={STROKE} strokeWidth="1.8" />
      <path d="M18 22 V17 A6 6 0 0 1 30 15" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="30" r="2.4" fill={ICE} />
      <path d="M24 32 V35" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Terminal prompt - native worker. */
export function TerminalGlyph({ className = "" }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="10" width="36" height="28" rx="6" stroke={STROKE} strokeWidth="1.8" />
      <path d="M13 21 L18 25 L13 29" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 29 H30" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round">
        <animate attributeName="opacity" values="1;0.2;1" dur="2.2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/** Browser window with a soft spark - browser worker. */
export function BrowserGlyph({ className = "" }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="9" width="36" height="30" rx="6" stroke={STROKE} strokeWidth="1.8" />
      <path d="M6 17 H42" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="11" cy="13" r="1.4" fill={ICE} />
      <circle cx="16" cy="13" r="1.4" fill={ICE} opacity="0.5" />
      <path d="M24 22 L27 29 H21 Z M24 29 L21 35 M24 29 L27 35" stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="3.2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/** Plug into a socket - OpenAI-compatible API. */
export function ApiGlyph({ className = "" }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M8 24 H20" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="20" y="17" width="10" height="14" rx="4" stroke={STROKE} strokeWidth="1.8" />
      <path d="M23 12 V17 M27 12 V17" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M30 24 H40" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14" cy="24" r="2" fill={ICE}>
        <animate attributeName="cx" values="9;19;9" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;0" dur="3.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
