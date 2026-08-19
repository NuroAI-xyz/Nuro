import { PrivyProvider } from "@privy-io/react-auth";
import { type ReactNode } from "react";
import { PrivyReadyContext } from "./privy-ready";

/**
 * Robinhood Chain — the EVM (Arbitrum Orbit L2) network Nuro settles on.
 * ETH is the native gas token. Defined inline (viem isn't a direct dep of this
 * package) as a viem-`Chain`-shaped object for Privy's default/supported chains.
 */
const robinhoodChain = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
};

/**
 * The actual Privy provider. This module statically imports the browser-only
 * Privy SDK, so it is ONLY ever loaded via a dynamic import on the client
 * (see auth-provider.tsx) — it must never enter the SSR server bundle, or the
 * Vercel serverless function crashes at init tracing Privy's wallet deps.
 *
 * The config here MUST stay in lockstep with what the Privy dashboard app
 * enables. We're EVM on Robinhood Chain: wallet login is ethereum-only and the
 * default/supported chain is Robinhood. (Requesting a disabled method — e.g.
 * Twitter OAuth or solana-only wallets — makes Privy fail to initialise with a
 * generic "Something went wrong".)
 */
export default function PrivyWrapper({
  appId,
  children,
}: {
  appId: string;
  children: ReactNode;
}) {
  return (
    <PrivyReadyContext.Provider value={true}>
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["email", "google", "twitter", "wallet"],
          defaultChain: robinhoodChain,
          supportedChains: [robinhoodChain],
          appearance: {
            theme: "dark",
            accentColor: "#7ED6FF",
            logo: "/brand-mark.png",
            walletChainType: "ethereum-only",
          },
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
          },
        }}
      >
        {children}
      </PrivyProvider>
    </PrivyReadyContext.Provider>
  );
}
