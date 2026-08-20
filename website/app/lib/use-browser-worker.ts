import { useCallback, useRef, useState } from "react";
import { ORCHESTRATOR_WS_URL } from "./orchestrator";

/**
 * Default browser model — a WebLLM prebuilt id (Qwen, WebGPU / q4f16).
 *
 * Defaults to the 1.5B model (~1.2 GB) because it loads reliably on typical
 * laptops; the 7B needs ~4.5 GB of VRAM and fails to allocate on most consumer
 * GPUs, which made the "Start" button appear broken. Override with
 * `VITE_BROWSER_MODEL` (a WebLLM prebuilt id) to serve a bigger model.
 */
const BROWSER_MODEL = {
  id: (import.meta.env.VITE_BROWSER_MODEL_ID as string) || "nuro-browser-1.5b",
  engine: "webllm" as const,
  ref:
    (import.meta.env.VITE_BROWSER_MODEL as string) ||
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
};

export type BrowserWorkerStatus = "idle" | "loading" | "online" | "error";

/**
 * Confirm WebGPU is actually usable before we try to load a model — otherwise
 * WebLLM throws an opaque error deep in init and the button looks dead. Returns
 * a human message when unavailable, or null when good to go.
 */
async function webgpuUnavailableReason(): Promise<string | null> {
  const gpu = (navigator as unknown as { gpu?: unknown }).gpu as
    | { requestAdapter: () => Promise<unknown> }
    | undefined;
  if (!gpu) {
    return "Your browser doesn't support WebGPU. Use Chrome or Edge 113+ (desktop), or enable WebGPU in your browser flags.";
  }
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return "No WebGPU adapter available. Turn on hardware acceleration and update your GPU drivers, then reload.";
    }
  } catch {
    return "Couldn't initialise WebGPU on this device.";
  }
  return null;
}

/**
 * Lifecycle for the in-tab WebGPU (WebLLM) worker. The heavy
 * `@nuroaixyz/worker/browser` module (and WebLLM) is dynamically imported only
 * on start, so it never touches SSR.
 *
 * Design goal: the button works *regardless* of the backend. The model always
 * loads and runs in the tab (needs only WebGPU); joining the orchestrator to
 * actually earn is best-effort. If the network/token fails (backend down, CORS,
 * etc.) the worker stays "online (local)" instead of hard-erroring — and can be
 * reconnected once the network is reachable.
 */
export function useBrowserWorker() {
  const [status, setStatus] = useState<BrowserWorkerStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  // true = registered with the orchestrator (earning); false = local-only.
  const [networked, setNetworked] = useState(false);
  const stopRef = useRef<null | (() => void)>(null);

  const start = useCallback(
    async (getToken: () => Promise<string>) => {
      setStatus("loading");
      setProgress(0);
      setNetworked(false);
      setMessage("Checking WebGPU support…");
      try {
        const unavailable = await webgpuUnavailableReason();
        if (unavailable) {
          setStatus("error");
          setMessage(unavailable);
          return;
        }

        // 1) Load the model — this only needs WebGPU, no backend.
        setMessage("Loading model into your browser (first run downloads it)…");
        const { BrowserWorker, WebLLMEngine } = await import(
          "@nuroaixyz/worker/browser"
        );
        const engine = new WebLLMEngine({
          onProgress: (p) => {
            setProgress(p.progress ?? 0);
            if (p.text) setMessage(p.text);
          },
        });
        await engine.ensureReady(BROWSER_MODEL);

        // Model is live in the tab regardless of what the network does.
        setStatus("online");
        setProgress(1);
        setMessage("Model running in this tab · connecting to the network…");
        stopRef.current = () => {
          void engine.unload().catch(() => {});
        };

        // 2) Best-effort: join the orchestrator so the worker actually earns.
        try {
          const token = await getToken();
          const worker = new BrowserWorker({
            orchestratorUrl: ORCHESTRATOR_WS_URL,
            token,
            model: BROWSER_MODEL,
            engine,
            onStatus: (s) => setMessage(s),
          });
          await worker.start();
          stopRef.current = () => {
            try {
              worker.stop();
            } catch {
              /* noop */
            }
            void engine.unload().catch(() => {});
          };
          setNetworked(true);
          setMessage("Online · connected to the network — serving jobs from this tab.");
        } catch {
          // Backend unreachable / not signed in — keep running locally.
          setNetworked(false);
          setMessage(
            "Running in this tab. Can't reach the network right now — it'll start earning once the connection is back.",
          );
        }
      } catch (e) {
        setStatus("error");
        setMessage(
          e instanceof Error
            ? e.message
            : "Failed to start browser worker (WebGPU required)",
        );
      }
    },
    [],
  );

  const stop = useCallback(() => {
    try {
      stopRef.current?.();
    } catch {
      /* noop */
    }
    stopRef.current = null;
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setNetworked(false);
  }, []);

  return { status, progress, message, networked, start, stop };
}
