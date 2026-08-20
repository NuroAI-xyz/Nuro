import { Suspense, lazy } from "react";
import type { Route } from "./+types/profile";
import { SiteHeader } from "../components/layout/site-chrome";
import { usePrivyReady } from "../components/auth/privy-ready";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Account · Nuro AI" },
    {
      name: "description",
      content:
        "Your Nuro account: profile, embedded wallet, $NURO balance, and send/receive on Robinhood Chain.",
    },
  ];
}

// Reads Privy user + wallet hooks, so it pulls in the browser-only Privy SDK.
// Client-only chunk, mounted only once Privy is ready — keeps the SDK out of
// the SSR server bundle entirely.
const ProfileApp = lazy(() => import("../components/profile/profile-app"));

export default function ProfileRoute() {
  const privyReady = usePrivyReady();

  if (!privyReady) return <ProfileBooting />;

  return (
    <Suspense fallback={<ProfileBooting />}>
      <ProfileApp />
    </Suspense>
  );
}

function ProfileBooting() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative flex flex-1 items-center justify-center pb-10">
        <p className="text-sm text-[#8a8a8a]">Loading your account…</p>
      </main>
    </div>
  );
}
