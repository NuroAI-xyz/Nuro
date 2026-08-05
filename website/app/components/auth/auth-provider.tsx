import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
// Type-only import (erased at build) so the browser-only Solana connector
// module never lands in the SSR server bundle.
import type { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

type SolanaConnectors = ReturnType<typeof toSolanaWalletConnectors>;

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

const queryClient = new QueryClient();

/**
 * Wraps the app in Privy configured for Solana: email + X sign-in plus external
 * Solana wallets (Phantom / Solflare / Backpack). No embedded wallets are
 * auto-created — pure auth + BYO wallet, so payments settle from self-custody.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!APP_ID) return <>{children}</>;
  return <PrivyWrapper appId={APP_ID}>{children}</PrivyWrapper>;
}

function PrivyWrapper({
  appId,
  children,
}: {
  appId: string;
  children: ReactNode;
}) {
  // Solana wallet connectors are browser-only. Loading them via a dynamic
  // import after mount keeps `@privy-io/react-auth/solana` (and its optional
  // wallet-standard deps like @farcaster/mini-app-solana) out of the SSR
  // server bundle — otherwise the serverless function crashes at init.
  const [connectors, setConnectors] = useState<SolanaConnectors | undefined>(
    undefined,
  );
  useEffect(() => {
    let active = true;
    void import("@privy-io/react-auth/solana").then((m) => {
      if (active) setConnectors(m.toSolanaWalletConnectors());
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "twitter", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#7ED6FF",
          logo: "/black_background-removebg-preview.png",
          walletChainType: "solana-only",
        },
        externalWallets: connectors ? { solana: { connectors } } : undefined,
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrivyProvider>
  );
}
