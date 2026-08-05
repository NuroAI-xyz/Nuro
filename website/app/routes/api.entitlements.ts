/** Returns the caller's current entitlements (free trials + credits) from the
 * signed cookie. Used by the assistant UI on load and after each send. */
import type { LoaderFunctionArgs } from "react-router";
import { getState, view } from "../lib/entitlements.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response(JSON.stringify(view(getState(request))), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
