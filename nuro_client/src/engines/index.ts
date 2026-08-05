import type { InferenceEngineAdapter } from "./ollama.js";
import { OllamaEngine } from "./ollama.js";
import type { InferenceEngine, ModelInfo } from "../types.js";

export { OllamaEngine, type InferenceEngineAdapter };

export function createEngine(
  model: ModelInfo,
  options?: {
    ollamaHost?: string;
    autoPull?: boolean;
    onStatus?: (message: string) => void;
  },
): InferenceEngineAdapter {
  switch (model.engine) {
    case "ollama":
      return new OllamaEngine(options?.ollamaHost ?? "http://127.0.0.1:11434", {
        autoPull: options?.autoPull ?? false,
        onStatus: options?.onStatus,
      });
    case "vllm":
      throw new Error(
        "vLLM engine is not implemented yet. Use Ollama for v1 native workers.",
      );
    case "webllm":
      throw new Error(
        "WebLLM runs in the browser. Import from @nuroaixyz/worker/browser instead.",
      );
    default: {
      const _exhaustive: never = model.engine;
      throw new Error(`Unsupported engine: ${_exhaustive}`);
    }
  }
}

export type { InferenceEngine };
