import type { ReactNode } from "react";

/** Page title block. */
export function DocHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
}) {
  return (
    <header className="mb-10">
      {eyebrow && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7ED6FF]/80">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[clamp(2rem,4vw,2.9rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
        {title}
      </h1>
      {lead && (
        <p className="mt-5 text-[17px] leading-relaxed text-[#9a9a9a]">{lead}</p>
      )}
    </header>
  );
}

type CalloutTone = "info" | "warn" | "success" | "neutral";

const TONES: Record<CalloutTone, { border: string; bg: string; dot: string; label: string }> = {
  info: {
    border: "rgba(126,214,255,0.28)",
    bg: "rgba(126,214,255,0.05)",
    dot: "#7ED6FF",
    label: "#D4F3FF",
  },
  warn: {
    border: "rgba(255,242,213,0.28)",
    bg: "rgba(255,242,213,0.04)",
    dot: "#FFE7A8",
    label: "#FFF2D5",
  },
  success: {
    border: "rgba(74,222,128,0.28)",
    bg: "rgba(74,222,128,0.05)",
    dot: "#4ADE80",
    label: "#9EEBBB",
  },
  neutral: {
    border: "rgba(255,255,255,0.12)",
    bg: "rgba(255,255,255,0.02)",
    dot: "#8a8a8a",
    label: "#c9c9c9",
  },
};

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      className="docs-callout"
      style={{ borderColor: t.border, background: t.bg }}
    >
      {title && (
        <p
          className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: t.label }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: t.dot }}
          />
          {title}
        </p>
      )}
      <div className="text-[#b4b4b4] [&_strong]:text-white">{children}</div>
    </div>
  );
}

export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="docs-code">
      <code>{children}</code>
    </pre>
  );
}

/** Centers an illustration/diagram in a soft glass frame with a caption. */
export function Figure({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <figure className="my-8">
      <div className="glass-panel overflow-hidden rounded-3xl p-6 sm:p-8">
        {children}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-[13px] text-[#6f6f6f]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function StatGrid({
  items,
}: {
  items: { value: string; label: string; accent?: boolean }[];
}) {
  return (
    <div className="my-8 grid gap-4 sm:grid-cols-3">
      {items.map((s) => (
        <div key={s.label} className="glass-panel rounded-2xl p-5">
          <p
            className={`text-2xl font-semibold tracking-[-0.02em] ${
              s.accent ? "text-[#7ED6FF]" : ""
            }`}
          >
            {s.value}
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-[#8a8a8a]">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="my-8 grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function InfoCard({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="card glass-panel h-full rounded-2xl p-6">
      {icon && <div className="mb-4 h-10 w-10 text-[#7ED6FF]">{icon}</div>}
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#D4F3FF]">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[#8a8a8a]">{children}</p>
    </div>
  );
}

/** Simple two-column definition rows (glossary, key/value tables). */
export function DefTable({
  rows,
}: {
  rows: { term: ReactNode; def: ReactNode }[];
}) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-white/[0.08]">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-6 ${
            i !== 0 ? "border-t border-white/[0.06]" : ""
          }`}
        >
          <dt className="text-[14px] font-medium text-white">{r.term}</dt>
          <dd className="text-[14px] leading-relaxed text-[#8a8a8a]">{r.def}</dd>
        </div>
      ))}
    </div>
  );
}
