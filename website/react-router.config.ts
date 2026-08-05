import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Splits routes into per-route Vercel functions instead of one giant bundle,
  // so the SSR function doesn't crash at cold-start under the Solana/Privy deps.
  presets: [vercelPreset()],
} satisfies Config;
