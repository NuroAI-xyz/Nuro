import { useCallback, useRef, useState } from "react";
import { ORCHESTRATOR_WS_URL } from "./orchestrator";

/** Default browser model - a WebLLM prebuilt id (Qwen, WebGPU / q4f16). */
const BROWSER_MODEL = {
  id: "nuro-browser-8b",
  engine: "webllm" as const,
  ref: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
};

export type BrowserWorkerStatus = "idle" | "loading" | "online" | "error";

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
    setMessage("Loading model into your browser…");
    try {
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
