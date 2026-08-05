import { usePrivy } from "@privy-io/react-auth";

/**
 * Nav auth control. Opens Privy's email / X sign-in modal, and flips to a
 * sign-out action once authenticated.
 */
export function LoginButton({ className = "" }: { className?: string }) {
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
