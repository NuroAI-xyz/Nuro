import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useEffect, useState, type ReactNode } from "react";
import { PrivyReadyContext } from "./privy-ready";

type SolanaConnectors = ReturnType<typeof toSolanaWalletConnectors>;

/**
 * The actual Privy provider. This module statically imports the browser-only
 * Privy SDK, so it is ONLY ever loaded via a dynamic import on the client
 * (see auth-provider.tsx) — it must never enter the SSR server bundle, or the
 * Vercel serverless function crashes at init tracing Privy's wallet deps.
 */
export default function PrivyWrapper({
  appId,
  children,
}: {
  appId: string;
  children: ReactNode;
}) {
  // Solana wallet-standard detection touches browser globals; run it after mount.
  const [connectors, setConnectors] = useState<SolanaConnectors | undefined>(
    undefined,
  );
  useEffect(() => {
    setConnectors(toSolanaWalletConnectors());
  }, []);

  return (
    <PrivyReadyContext.Provider value={true}>
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["email", "twitter", "wallet"],
          appearance: {
            theme: "dark",
            accentColor: "#7ED6FF",
            logo: "/brand-mark.png",
            walletChainType: "solana-only",
          },
          externalWallets: connectors ? { solana: { connectors } } : undefined,
          embeddedWallets: {
            ethereum: { createOnLogin: "off" },
            solana: { createOnLogin: "off" },
          },
        }}
      >
        {children}
      </PrivyProvider>
    </PrivyReadyContext.Provider>
  );
}
