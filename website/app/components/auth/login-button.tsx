import { Suspense, lazy } from "react";
import { usePrivyReady } from "./privy-ready";

// Client-only: the interactive control pulls in the browser-only Privy SDK,
// which must not enter the SSR server bundle.
const LoginButtonInner = lazy(() => import("./login-button-inner"));

/**
 * Nav auth control. Renders a static button during SSR / before Privy mounts,
 * then swaps to the interactive Privy sign-in/out control on the client.
 */
export function LoginButton({ className = "" }: { className?: string }) {
  const ready = usePrivyReady();

  const placeholder = (
    <button type="button" className={className} disabled>
      Login
    </button>
  );

  if (!ready) return placeholder;

  return (
    <Suspense fallback={placeholder}>
      <LoginButtonInner className={className} />
    </Suspense>
  );
}
