import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { PrivyReadyContext } from "./privy-ready";

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

const queryClient = new QueryClient();

// Loaded only on the client, so the browser-only Privy SDK never lands in the
// SSR server bundle (which would crash Vercel's serverless function at init).
const PrivyWrapper = lazy(() => import("./privy-wrapper"));

/**
 * Auth + data providers. React Query wraps everything (SSR-safe). Privy is
 * mounted client-only after hydration; until then (and during SSR) the tree
 * renders normally with `PrivyReadyContext = false`, so no component reaches
 * for the Privy SDK on the server.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const enablePrivy = !!APP_ID && mounted;

  return (
    <QueryClientProvider client={queryClient}>
      {enablePrivy ? (
        <Suspense
          fallback={
            <PrivyReadyContext.Provider value={false}>
              {children}
            </PrivyReadyContext.Provider>
          }
        >
          <PrivyWrapper appId={APP_ID as string}>{children}</PrivyWrapper>
        </Suspense>
      ) : (
        <PrivyReadyContext.Provider value={false}>
          {children}
        </PrivyReadyContext.Provider>
      )}
    </QueryClientProvider>
  );
}
