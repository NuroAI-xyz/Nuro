/**
 * Client-side helpers for the in-app AI assistant.
 *
 * The assistant is powered by OpenRouter, but the browser NEVER sees the API
 * key: every request goes through the server route `/api/chat`, which holds the
 * key, enforces the free-tier / credit gate, and streams the reply back as
 * OpenAI-style SSE. Usage (free trials + purchased credits) is metered
 * server-side in a signed cookie, so the counts here are display-only mirrors
 * of the authoritative server state returned in the `X-Entitlements` header.
 */

/** A single content part of a message (OpenAI multimodal format). */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface AssistantMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface Entitlements {
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number;
  credits: number;
  /** total usable messages left right now (free + credits). */
  totalRemaining: number;
}

export const EMPTY_ENTITLEMENTS: Entitlements = {
  freeLimit: 5,
  freeUsed: 0,
  freeRemaining: 5,
  credits: 0,
  totalRemaining: 5,
};

/** Raised when the free tier is exhausted and there are no credits: the UI
 * catches this to open the paywall instead of showing a generic error. */
export class PaywallError extends Error {
  entitlements: Entitlements;
  constructor(message: string, entitlements: Entitlements) {
    super(message);
    this.name = "PaywallError";
    this.entitlements = entitlements;
  }
}

function parseEntitlements(header: string | null): Entitlements | null {
  if (!header) return null;
  try {
    return JSON.parse(header) as Entitlements;
  } catch {
    return null;
  }
}

/** Read the current entitlements from the server (called on page load). */
export async function fetchEntitlements(): Promise<Entitlements> {
  try {
    const res = await fetch("/api/entitlements", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return EMPTY_ENTITLEMENTS;
    return (await res.json()) as Entitlements;
  } catch {
    return EMPTY_ENTITLEMENTS;
  }
}

/**
 * Send the conversation to the server proxy and stream the assistant reply.
 * Returns the updated entitlements (from the `X-Entitlements` header). Throws
 * `PaywallError` when the request is blocked for lack of free trials / credits.
 */
export async function streamAssistant(
  messages: AssistantMessage[],
  handlers: {
    onToken: (t: string) => void;
    onDone: (ent: Entitlements | null) => void;
    onError: (message: string) => void;
  },
  opts: { signal?: AbortSignal; accessToken?: string | null } = {},
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.accessToken
          ? { Authorization: `Bearer ${opts.accessToken}` }
          : {}),
      },
      body: JSON.stringify({ messages }),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    handlers.onError(err instanceof Error ? err.message : "Network error");
    return;
  }

  const ent = parseEntitlements(res.headers.get("X-Entitlements"));

  if (res.status === 401) {
    handlers.onError("Please sign in to use the assistant.");
    return;
  }

  if (res.status === 402) {
    let msg = "You've used all your free messages.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new PaywallError(msg, ent ?? EMPTY_ENTITLEMENTS);
  }

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    handlers.onError(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      break; // aborted
    }
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const ev of events) {
      const dataLine = ev.match(/^data: (.+)$/m);
      if (!dataLine) continue;
      const payload = dataLine[1].trim();
      if (payload === "[DONE]") {
        handlers.onDone(ent);
        return;
      }
      try {
        const json = JSON.parse(payload);
        const choice = json.choices?.[0];
        const token = choice?.delta?.content;
        if (typeof token === "string") handlers.onToken(token);
      } catch {
        /* ignore keep-alive / malformed chunk */
      }
    }
  }
  handlers.onDone(ent);
}
