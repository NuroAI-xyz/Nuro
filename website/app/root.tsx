import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { LiquidGlassDefs } from "./components/brand/liquid-glass";
import { AuthProvider } from "./components/auth/auth-provider";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.png", type: "image/png" },
  { rel: "apple-touch-icon", href: "/favicon.png" },
  { rel: "preconnect", href: "https://api.fontshare.com" },
  {
    rel: "stylesheet",
    href: "https://api.fontshare.com/v2/css?f[]=host-grotesk@400,500,600,700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Social preview (Open Graph + Twitter) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Nuro AI" />
        <meta property="og:image" content="https://nuroai.xyz/og.png" />
        <meta property="og:image:width" content="1360" />
        <meta property="og:image:height" content="720" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://nuroai.xyz/og.png" />
        <Meta />
        <Links />
      </head>
      <body>
        <LiquidGlassDefs />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="page-shell section-gap">
      <h1 className="text-3xl font-semibold">{message}</h1>
      <p className="mt-4 text-[#8a8a8a]">{details}</p>
    </main>
  );
}
