import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { nav, siblingLinks, type DocLink } from "../../lib/nav";
import { Toc, type TocItem } from "../util/toc";
import { socialLinks } from "../brand/icons";

const APP_URL = "https://nuroai.xyz";

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-1">
      {nav.map((section) => (
        <div key={section.label}>
          <p className="docs-nav-group">{section.label}</p>
          {section.items.map((item) => {
            const active = item.path === pathname;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`docs-nav-link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function MenuToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className="relative inline-flex h-10 w-10 items-center justify-center text-white lg:hidden"
    >
      <span className="relative block h-4 w-6">
        <span
          className={`absolute left-0 top-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
            open ? "top-1/2 -translate-y-1/2 rotate-45" : ""
          }`}
        />
        <span
          className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-current transition-all duration-300 ${
            open ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
            open ? "bottom-1/2 translate-y-1/2 -rotate-45" : ""
          }`}
        />
      </span>
    </button>
  );
}

function Topbar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MenuToggle open={open} onClick={onToggle} />
          <a href={APP_URL} className="flex items-center gap-3">
            <img
              src="/black_background-removebg-preview.png"
              alt="Nuro"
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-semibold tracking-[0.2em]">NURO</span>
            <span className="rounded-md border border-white/[0.1] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a8a8a]">
              Docs
            </span>
          </a>
        </div>

        <div className="flex items-center gap-4 md:gap-5">
          <div className="hidden items-center gap-3.5 sm:flex">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="text-[#8a8a8a] transition-colors duration-300 hover:text-white"
              >
                <Icon className="h-[17px] w-[17px]" />
              </a>
            ))}
          </div>
          <a
            href={APP_URL}
            className="btn-primary px-4 py-2 text-xs md:px-5 md:py-2.5"
          >
            Launch app
          </a>
        </div>
      </div>
    </header>
  );
}

function PrevNext({ prev, next }: { prev: DocLink | null; next: DocLink | null }) {
  if (!prev && !next) return null;
  return (
    <div className="mt-16 grid gap-4 border-t border-white/[0.06] pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          to={prev.path}
          className="card glass-panel group rounded-2xl p-5 transition"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5c5c5c]">
            Previous
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-[15px] font-medium text-white">
            <ArrowIcon className="h-4 w-4 rotate-180 text-[#7ED6FF]" />
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={next.path}
          className="card glass-panel group rounded-2xl p-5 text-right transition"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5c5c5c]">
            Next
          </span>
          <span className="mt-1.5 flex items-center justify-end gap-2 text-[15px] font-medium text-white">
            {next.title}
            <ArrowIcon className="h-4 w-4 text-[#7ED6FF]" />
          </span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

export function DocsLayout({
  toc = [],
  children,
}: {
  toc?: TocItem[];
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { prev, next } = siblingLinks(pathname);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient top wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 opacity-60"
        style={{
          background:
            "radial-gradient(70% 100% at 50% 0%, rgba(126,214,255,0.07), transparent 70%)",
        }}
      />

      <Topbar open={open} onToggle={() => setOpen((v) => !v)} />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] gap-8 px-4 sm:px-6 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="docs-scroll sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-white/[0.05] py-10 pr-4 lg:block">
          <SidebarNav pathname={pathname} />
        </aside>

        {/* Content + TOC */}
        <div className="flex min-w-0 flex-1 gap-10">
          <main className="min-w-0 flex-1 py-10 lg:py-14">
            <article className="load-fade mx-auto max-w-3xl">{children}</article>
            <div className="mx-auto max-w-3xl">
              <PrevNext prev={prev} next={next} />
            </div>
          </main>

          <aside className="docs-scroll sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 overflow-y-auto py-14 xl:block">
            <Toc items={toc} />
          </aside>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`docs-scroll absolute left-0 top-16 h-[calc(100vh-4rem)] w-72 max-w-[82vw] overflow-y-auto border-r border-white/[0.08] bg-black/95 px-5 py-8 backdrop-blur-xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarNav pathname={pathname} />
        </div>
      </div>
    </div>
  );
}
