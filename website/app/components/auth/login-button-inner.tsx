import { usePrivy } from "@privy-io/react-auth";

/**
 * Interactive auth control. Lives in its own module (statically importing the
 * browser-only Privy SDK) so it can be loaded client-only via login-button.tsx
 * — keeping the SDK out of the SSR server bundle.
 */
export default function LoginButtonInner({
  className = "",
}: {
  className?: string;
}) {
  const { ready, authenticated, login, logout } = usePrivy();

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => (authenticated ? logout() : login())}
      className={className}
    >
      {authenticated ? "Log out" : "Login"}
    </button>
  );
}
