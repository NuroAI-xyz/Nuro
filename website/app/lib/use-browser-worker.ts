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

interface BrowserWorkerHandle {
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Lifecycle for the in-tab WebGPU (WebLLM) worker. The heavy `@nuroaixyz/worker/browser`
 * module (and WebLLM) is dynamically imported only on start, so it never touches SSR.
 */
export function useBrowserWorker() {
  const [status, setStatus] = useState<BrowserWorkerStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const workerRef = useRef<BrowserWorkerHandle | null>(null);

  const start = useCallback(async (token: string) => {
    setStatus("loading");
    setProgress(0);
    setMessage("Checking WebGPU support…");
    try {
      const unavailable = await webgpuUnavailableReason();
      if (unavailable) {
        setStatus("error");
        setMessage(unavailable);
        return;
      }

      setMessage("Loading model into your browser (first run downloads it)…");
      const { createBrowserWorker } = await import("@nuroaixyz/worker/browser");
      const worker = await createBrowserWorker({
        orchestratorUrl: ORCHESTRATOR_WS_URL,
        token,
        model: BROWSER_MODEL,
        onProgress: (p) => {
          setProgress(p.progress ?? 0);
          if (p.text) setMessage(p.text);
        },
        onStatus: (s) => setMessage(s),
      });
      await worker.start();
      workerRef.current = worker;
      setStatus("online");
      setMessage("Online - serving jobs from this tab");
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error
          ? e.message
          : "Failed to start browser worker (WebGPU required)",
      );
    }
  }, []);

  const stop = useCallback(() => {
    try {
      workerRef.current?.stop();
    } catch {
      /* noop */
    }
    workerRef.current = null;
    setStatus("idle");
    setProgress(0);
    setMessage("");
  }, []);

  return { status, progress, message, start, stop };
}
