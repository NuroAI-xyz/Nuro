/**
 * Same-origin proxy for the orchestrator HTTP API.
 *
 * The browser calls `/api/orch/v1/...` on this site; we forward it server-to-
 * server to the real orchestrator and stream the response back. This does two
 * things at once:
 *   1. Kills CORS — the browser only ever talks to its own origin, and the
 *      server-to-server hop isn't subject to browser CORS at all.
 *   2. Keeps the backend host out of the client entirely — the raw orchestrator
 *      URL never appears in the frontend, network tab aside from `/api/orch`.
 *
 * Streaming is preserved (we pipe the upstream body straight through), so SSE
 * endpoints like `/v1/test-job` and `/v1/chat/completions` keep working.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ORCHESTRATOR_URL } from "../lib/orchestrator";

// Only these headers are forwarded to/from the orchestrator; everything else
// (cookies, host, origin, etc.) is dropped so nothing leaks in either direction.
const FORWARD_REQUEST_HEADERS = ["authorization", "content-type", "accept"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "cache-control"];

async function proxy(request: Request, splat: string): Promise<Response> {
  const search = new URL(request.url).search;
  const target = `${ORCHESTRATOR_URL}/${splat}${search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return new Response(
      JSON.stringify({ error: "Upstream unavailable" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const respHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) respHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export function loader({ request, params }: LoaderFunctionArgs) {
  return proxy(request, params["*"] ?? "");
}

export function action({ request, params }: ActionFunctionArgs) {
  return proxy(request, params["*"] ?? "");
}
