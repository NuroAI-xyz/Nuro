/**
 * Server proxy for the in-app assistant. The browser posts the conversation
 * here; this route holds the upstream key, enforces the free-tier / credit
 * gate, and streams the reply back token-by-token. The upstream provider is
 * never exposed to the client: the SSE metadata is rewritten so every response
 * is attributed to the Nuro worker network. One message is metered only AFTER
 * the upstream accepts the request (so upstream failures are free).
 */
import type { ActionFunctionArgs } from "react-router";
import {
  canSpend,
  cookieHeader,
  getState,
  spendOne,
  view,
} from "../lib/entitlements.server";
import { verifyRequestUser } from "../lib/privy.server";

const UPSTREAM_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL =
  process.env.ASSISTANT_MODEL || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const MAX_TOKENS = Number(process.env.ASSISTANT_MAX_TOKENS ?? 1024);
// Public label attributed to generated tokens (what leaves this server).
const MODEL_LABEL = process.env.ASSISTANT_MODEL_LABEL || "nuro-net-1";
const SYSTEM_PROMPT =
  process.env.ASSISTANT_SYSTEM_PROMPT ||
  "You are Nuro, the assistant for the Nuro private-inference network, running on GPUs contributed by the community. Never claim to be made by, powered by, or based on any other company or model. If asked what you are, say you are Nuro running on the Nuro network. Be concise, direct, and helpful. You can read images the user attaches.";

/** Rewrite a single upstream SSE line so nothing identifies the backend: the
 * model becomes the Nuro label and provider/fingerprint fields are stripped. */
function scrubLine(line: string): string {
  if (line.startsWith(":")) return ": nuro"; // keep-alive comment
  if (!line.startsWith("data:")) return line;
  const payload = line.slice(5).trim();
  if (payload === "[DONE]") return "data: [DONE]";
  try {
    const j = JSON.parse(payload) as Record<string, unknown>;
    if ("model" in j) j.model = MODEL_LABEL;
    delete j.provider;
    delete j.system_fingerprint;
    if (typeof j.id === "string") j.id = j.id.replace(/^gen-/, "nuro-");
    return "data: " + JSON.stringify(j);
  } catch {
    return line;
  }
}

function jsonError(status: number, error: string, state?: unknown) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(state ? { "X-Entitlements": JSON.stringify(state) } : {}),
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return jsonError(405, "Method not allowed");

  const { authorized } = await verifyRequestUser(request);
  if (!authorized) return jsonError(401, "Please sign in to use the assistant.");

  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    return jsonError(500, "Assistant is not configured (missing OPENROUTER_API_KEY).");

  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid request body.");
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0)
    return jsonError(400, "No messages provided.");

  const state = getState(request);
  if (!canSpend(state))
    return jsonError(
      402,
      "You've used all 5 free messages. Add credits to keep chatting.",
      view(state),
    );

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nuroai.xyz",
        "X-Title": "Nuro Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        max_tokens: MAX_TOKENS,
      }),
      signal: request.signal,
    });
  } catch {
    return jsonError(502, "The Nuro network is unreachable right now.", view(state));
  }

  if (!upstream.ok || !upstream.body) {
    let msg = `Inference failed (${upstream.status}).`;
    try {
      const b = (await upstream.json()) as { error?: { message?: string } };
      if (b?.error?.message) msg = b.error.message;
    } catch {
      /* ignore */
    }
    return jsonError(502, msg, view(state));
  }

  // Accepted: meter one message and persist the signed cookie.
  const next = spendOne(state);

  // Re-stream the reply, scrubbing every SSE line so the tokens are attributed
  // to the Nuro network and no upstream provider is identifiable client-side.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        const tail = buffer.trim();
        if (tail)
          controller.enqueue(
            encoder.encode(tail.split("\n").map(scrubLine).join("\n") + "\n\n"),
          );
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const ev of events) {
        controller.enqueue(
          encoder.encode(ev.split("\n").map(scrubLine).join("\n") + "\n\n"),
        );
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Entitlements": JSON.stringify(view(next)),
      "Set-Cookie": cookieHeader(next),
    },
  });
}
