import { Suspense, lazy } from "react";
import type { Route } from "./+types/assistant";
import { SiteHeader } from "../components/layout/site-chrome";
import { AssistantMascot } from "../components/assistant/mascot";
import { usePrivyReady } from "../components/auth/privy-ready";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Assistant · Nuro AI" },
    {
      name: "description",
      content:
        "Chat with the Nuro assistant. Five free messages, then credits — paid in USDC (and $NURO at launch) — power the in-app AI.",
    },
  ];
}

// The chat app calls usePrivy + wallet hooks, so it pulls in the browser-only
// Privy SDK. Keep it in a client-only chunk and render it only once Privy is
// mounted — that keeps the SDK out of the SSR server bundle entirely.
const AssistantApp = lazy(() => import("../components/assistant/assistant-app"));

export default function AssistantRoute() {
  const privyReady = usePrivyReady();

  if (!privyReady) return <AssistantBooting />;

  return (
    <Suspense fallback={<AssistantBooting />}>
      <AssistantApp />
    </Suspense>
  );
}

function AssistantBooting() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative flex flex-1 flex-col items-center justify-center pb-10">
        <AssistantMascot />
        <p className="mt-6 text-sm text-[#8a8a8a]">Loading the assistant…</p>
      </main>
    </div>
  );
}
