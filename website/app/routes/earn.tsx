import { Suspense, lazy } from "react";
import type { Route } from "./+types/earn";
import { SiteFooter, SiteHeader } from "../components/layout/site-chrome";
import { usePrivyReady } from "../components/auth/privy-ready";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Earn - Worker Node · Nuro AI" },
    {
      name: "description",
      content:
        "Contribute your GPU to the Nuro private inference network and earn. Run a native worker in the background, or a browser worker in one click.",
    },
  ];
}

// The earn dashboard calls usePrivy + orchestrator hooks, pulling in the
// browser-only Privy SDK. Load it client-only once Privy has mounted so the
// SDK stays out of the SSR server bundle.
const EarnApp = lazy(() => import("../components/earn/earn-app"));

export default function EarnRoute() {
  const privyReady = usePrivyReady();

  if (!privyReady) return <EarnBooting />;

  return (
    <Suspense fallback={<EarnBooting />}>
      <EarnApp />
    </Suspense>
  );
}

function EarnBooting() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative flex min-h-[50vh] items-center justify-center pt-20 pb-24">
        <p className="text-sm text-[#8a8a8a]">Loading…</p>
      </main>
      <SiteFooter />
    </div>
  );
}
