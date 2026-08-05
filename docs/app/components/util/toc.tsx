import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

/**
 * Right-hand "On this page" list with scroll-spy. Highlights the heading
 * nearest the top of the viewport as the reader scrolls.
 */
export function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0 || typeof IntersectionObserver === "undefined") return;

    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: [0, 1] },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5c5c5c]">
        On this page
      </p>
      <div>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`docs-toc-link ${item.depth === 3 ? "toc-h3" : ""} ${
              activeId === item.id ? "is-active" : ""
            }`}
          >
            {item.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
