import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

const queryClient = new QueryClient();
const solanaConnectors = toSolanaWalletConnectors();

/**
 * Wraps the app in Privy configured for Solana: email + X sign-in plus external
 * Solana wallets (Phantom / Solflare / Backpack). No embedded wallets are
 * auto-created — pure auth + BYO wallet, so payments settle from self-custody.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!APP_ID) return <>{children}</>;

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ["email", "twitter", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#7ED6FF",
          logo: "/black_background-removebg-preview.png",
          walletChainType: "solana-only",
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
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
