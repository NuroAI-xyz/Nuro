import {
  CreateMLCEngine,
  type InitProgressReport,
  type MLCEngineInterface,
} from "@mlc-ai/web-llm";
import type { ChatMessage, ModelInfo, TokenUsage } from "../types.js";
import type { BrowserInferenceEngine } from "./index.js";

export interface WebLLMProgress {
  /** 0..1 model load progress. */
  progress: number;
  text: string;
}

export interface WebLLMEngineOptions {
  onProgress?: (report: WebLLMProgress) => void;
}

/**
 * WebGPU inference engine backed by MLC WebLLM.
 *
 * `model.ref` must be a WebLLM prebuilt model id, e.g.
 * `Qwen2.5-7B-Instruct-q4f16_1-MLC`. The first `ensureReady` downloads and
 * compiles the model into the browser cache; subsequent runs are instant.
 */
export class WebLLMEngine implements BrowserInferenceEngine {
  private engine: MLCEngineInterface | null = null;
  private loadedRef: string | null = null;

  constructor(private readonly options: WebLLMEngineOptions = {}) {}

  async ensureReady(model: ModelInfo): Promise<void> {
    if (this.engine && this.loadedRef === model.ref) return;

    this.engine = await CreateMLCEngine(model.ref, {
      initProgressCallback: (report: InitProgressReport) => {
        this.options.onProgress?.({
          progress: report.progress,
          text: report.text,
        });
      },
    });
    this.loadedRef = model.ref;
  }

  async *streamCompletion(
    model: ModelInfo,
    messages: ChatMessage[],
    options?: { maxTokens?: number },
  ): AsyncGenerator<string, TokenUsage> {
    await this.ensureReady(model);
    const engine = this.engine;
    if (!engine) {
      throw new Error("WebLLM engine failed to initialize.");
    }

    const completion = await engine.chat.completions.create({
      // Our ChatMessage is a structural subset of WebLLM's message union,
      // which isn't exported from the package root.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: options?.maxTokens,
    });

    let usage: TokenUsage = { promptTokens: 0, completionTokens: 0 };

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
        };
      }
    }

    return usage;
  }

  /** Frees GPU memory and the compiled model. */
  async unload(): Promise<void> {
    await this.engine?.unload();
    this.engine = null;
    this.loadedRef = null;
  }
}

export async function createWebLLMEngine(
  model: ModelInfo,
  options?: WebLLMEngineOptions,
): Promise<WebLLMEngine> {
  const engine = new WebLLMEngine(options);
  await engine.ensureReady(model);
  return engine;
}
