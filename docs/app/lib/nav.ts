export interface DocLink {
  title: string;
  path: string;
}

export interface DocSection {
  label: string;
  items: DocLink[];
}

/** Sidebar structure. Order here also drives prev / next navigation. */
export const nav: DocSection[] = [
  {
    label: "Getting started",
    items: [
      { title: "Introduction", path: "/" },
      { title: "How it works", path: "/how-it-works" },
      { title: "Quickstart", path: "/quickstart" },
    ],
  },
  {
    label: "Architecture",
    items: [
      { title: "Sharded inference", path: "/sharded-inference" },
      { title: "The sealed wire", path: "/sealed-wire" },
      { title: "Correctness receipts", path: "/correctness" },
    ],
  },
  {
    label: "Privacy",
    items: [
      { title: "The reconstruction adversary", path: "/adversary" },
      { title: "Obfuscation and receipts", path: "/privacy-receipts" },
      { title: "Proof gates", path: "/proof-gates" },
    ],
  },
  {
    label: "Network",
    items: [
      { title: "The swarm", path: "/swarm" },
      { title: "Workers and earning", path: "/workers" },
    ],
  },
  {
    label: "$NURO",
    items: [
      { title: "Token and economics", path: "/token" },
      { title: "Staking and treasury", path: "/economics" },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Roadmap", path: "/roadmap" },
      { title: "Glossary", path: "/glossary" },
    ],
  },
];

/** Flattened, ordered list of every page (used for prev / next). */
export const flatNav: DocLink[] = nav.flatMap((s) => s.items);

export function siblingLinks(pathname: string): {
  prev: DocLink | null;
  next: DocLink | null;
} {
  const i = flatNav.findIndex((l) => l.path === pathname);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? flatNav[i - 1] : null,
    next: i < flatNav.length - 1 ? flatNav[i + 1] : null,
  };
}
