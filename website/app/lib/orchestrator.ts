/**
 * Client for the Nuro orchestrator HTTP API (orchestrator.nuroai.xyz).
 *
 * Configure via env:
 *   VITE_ORCHESTRATOR_URL     e.g. https://orchestrator.nuroai.xyz  (HTTP API)
 *   VITE_ORCHESTRATOR_WS_URL  e.g. wss://orchestrator.nuroai.xyz/v1/worker
 * Falls back to localhost for dev.
 */
const env = import.meta.env;

// Deployed orchestrator (Railway). Overridable via VITE_ORCHESTRATOR_URL /
// VITE_ORCHESTRATOR_WS_URL; used automatically in production builds so the
// site works even if those env vars are not set on the host.
const PROD_ORCHESTRATOR_URL = "https://noviqorchestrator-production.up.railway.app";
const PROD_ORCHESTRATOR_WS_URL =
  "wss://noviqorchestrator-production.up.railway.app/v1/worker";

const isLocalUrl = (u?: string) =>
  !!u && /:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(u);

// True only when the page itself is being served from localhost. (false during
// SSR, where `window` is undefined — that's fine, SSR should use the prod URL.)
const onLocalhost =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

/**
 * Resolve the orchestrator endpoint defensively. The footgun this guards
 * against: a dev `localhost` value gets copied into the production host's env
 * and baked into the build, so the live site tries to fetch `localhost:8787`
 * from the visitor's machine and every worker/earn call dies with
 * "Failed to fetch". If we're NOT on localhost, a localhost-configured URL is
 * ignored in favour of the deployed orchestrator.
 */
function resolveEndpoint(
  configured: string | undefined,
  prod: string,
  devDefault: string,
): string {
  if (configured && !(isLocalUrl(configured) && !onLocalhost)) return configured;
  if (!onLocalhost) return prod; // deployed (or SSR) → live backend
  return configured || devDefault; // genuine local dev
}

export const ORCHESTRATOR_URL = resolveEndpoint(
  env.VITE_ORCHESTRATOR_URL as string | undefined,
  PROD_ORCHESTRATOR_URL,
  "http://localhost:8787",
);

export const ORCHESTRATOR_WS_URL = resolveEndpoint(
  env.VITE_ORCHESTRATOR_WS_URL as string | undefined,
  PROD_ORCHESTRATOR_WS_URL,
  "ws://localhost:8787/v1/worker",
);

/**
 * Brand-neutral, display-only API base shown in docs/quickstart snippets.
 * Kept separate from ORCHESTRATOR_URL so the UI never surfaces the raw backend
 * host. Point VITE_PUBLIC_API_URL at a branded domain (e.g. api.nuroai.xyz)
 * once it resolves to the orchestrator; until then it's cosmetic.
 */
export const PUBLIC_API_URL =
  (env.VITE_PUBLIC_API_URL as string | undefined) || "https://api.nuroai.xyz";

export type WorkerClass = "native" | "browser";

export interface UserStats {
  earnedTodayUsd: number;
  earnedTotalUsd: number;
  jobsCompleted: number;
  workersOnline: number;
  uptimeSeconds: number;
  tokensPerSecond: number;
  workers: Array<{
    id: string;
    workerClass: string;
    modelId: string | null;
    status: "online" | "offline";
    connectedAt: string;
  }>;
  tokens: Array<{
    token: string;
    workerClass: string;
    label: string | null;
    createdAt: string;
    revoked: boolean;
  }>;
  payout: {
    address: string | null;
    availableUsd: number;
    thresholdUsd: number;
    canRequest: boolean;
    history: PayoutRecord[];
  };
  apiKeys: ApiKeyRecord[];
  billing: ConsumerBilling;
}

export interface TierPrice {
  inputPer1k: number;
  outputPer1k: number;
}

export interface ConsumerBilling {
  enabled: boolean;
  freeTier: number;
  freeUsed: number;
  freeRemaining: number;
  creditsUsd: number;
  workerRevenueShare: number;
  emissionNuroPer1k: number;
  tiers: {
    small: TierPrice;
    mid: TierPrice;
    large: TierPrice;
  };
}

export interface ApiKeyRecord {
  id: string;
  key: string; // masked
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface IssuedApiKey {
  id: string;
  key: string; // full secret, shown once
  label: string | null;
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  amountUsd: number;
  address: string;
  status: string;
  txHash: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface NetworkStats {
  workersOnline: number;
  nativeOnline: number;
  browserOnline: number;
  jobsInQueue: number;
}

class OrchestratorError extends Error {}

async function req<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${ORCHESTRATOR_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new OrchestratorError(message);
  }
  return (await res.json()) as T;
}

export function getMyStats(accessToken: string): Promise<UserStats> {
  return req<UserStats>("/v1/me/stats", { token: accessToken });
}

export function getNetworkStats(): Promise<NetworkStats> {
  return req<NetworkStats>("/v1/network");
}

export function requestWorkerToken(
  accessToken: string,
  workerClass: WorkerClass,
): Promise<{ token: string; workerClass: WorkerClass }> {
  return req("/v1/worker-token", {
    method: "POST",
    token: accessToken,
    body: JSON.stringify({ workerClass }),
  });
}

export function revokeWorkerToken(
  accessToken: string,
  token: string,
): Promise<{ revoked: boolean }> {
  return req(`/v1/tokens/${encodeURIComponent(token)}/revoke`, {
    method: "POST",
    token: accessToken,
  });
}

export function setPayoutAddress(
  accessToken: string,
  address: string,
  chainId?: number,
): Promise<{ ok: boolean; address: string }> {
  return req("/v1/me/payout-address", {
    method: "POST",
    token: accessToken,
    body: JSON.stringify({ address, chainId }),
  });
}

export function requestPayout(accessToken: string): Promise<PayoutRecord> {
  return req("/v1/me/payout", { method: "POST", token: accessToken });
}

/** Validate a Solana (base58, 32-44 char) wallet address client-side. */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
}

// --- Public inference API keys ---

export function createApiKey(
  accessToken: string,
  label?: string,
): Promise<IssuedApiKey> {
  return req("/v1/api-keys", {
    method: "POST",
    token: accessToken,
    body: JSON.stringify({ label }),
  });
}

export function revokeApiKey(
  accessToken: string,
  id: string,
): Promise<{ revoked: boolean }> {
  return req(`/v1/api-keys/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
    token: accessToken,
  });
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call the public OpenAI-compatible chat API with an API key and stream the
 * assistant reply token-by-token. Parses the OpenAI SSE format (`data: {…}`
 * chunks terminated by `data: [DONE]`).
 */
export async function streamChatCompletion(
  apiKey: string,
  messages: ChatMessage[],
  handlers: {
    onToken: (t: string) => void;
    onDone: () => void;
    onError: (message: string) => void;
  },
  opts: { model?: string; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${ORCHESTRATOR_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        stream: true,
        max_tokens: opts.maxTokens,
      }),
      signal: opts.signal,
    });
  } catch (err) {
    handlers.onError(err instanceof Error ? err.message : "Network error");
    return;
  }

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
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
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const dataLine = chunk.match(/^data: (.+)$/m);
      if (!dataLine) continue;
      const payload = dataLine[1].trim();
      if (payload === "[DONE]") {
        handlers.onDone();
        return;
      }
      try {
        const json = JSON.parse(payload);
        const choice = json.choices?.[0];
        const token = choice?.delta?.content;
        if (typeof token === "string") handlers.onToken(token);
        if (choice?.finish_reason === "error") {
          handlers.onError("Inference failed on the worker.");
          return;
        }
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
  handlers.onDone();
}

/**
 * Dispatch a test job to one of the user's online workers and stream the
 * result via SSE. Calls `onToken` for each token, resolves on `done`.
 */
export async function runTestJob(
  accessToken: string,
  prompt: string,
  handlers: {
    onToken: (t: string) => void;
    onDone: (usage: { promptTokens: number; completionTokens: number }) => void;
    onError: (message: string) => void;
  },
): Promise<void> {
  const res = await fetch(`${ORCHESTRATOR_URL}/v1/test-job`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok || !res.body) {
    let message = `Test job failed (${res.status})`;
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
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const evLine = chunk.match(/^event: (.+)$/m);
      const dataLine = chunk.match(/^data: (.+)$/m);
      if (!evLine || !dataLine) continue;
      const event = evLine[1].trim();
      const data = JSON.parse(dataLine[1]);
      if (event === "token") handlers.onToken(data.token);
      else if (event === "done") handlers.onDone(data.usage);
      else if (event === "error") handlers.onError(data.message);
    }
  }
}

export const ORCHESTRATOR_CONFIGURED = Boolean(env.VITE_ORCHESTRATOR_URL);
