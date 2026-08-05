import type {
  ChatMessage,
  InferenceEngine,
  ModelInfo,
  TokenUsage,
} from "../types.js";

export interface InferenceEngineAdapter {
  readonly engine: InferenceEngine;
  ensureReady(model: ModelInfo): Promise<void>;
  streamCompletion(
    model: ModelInfo,
    messages: ChatMessage[],
    options?: { maxTokens?: number },
  ): AsyncGenerator<string, TokenUsage>;
}

export interface OllamaTagsResponse {
  models: Array<{ name: string; model: string }>;
}

export interface OllamaEngineOptions {
  autoPull?: boolean;
  onStatus?: (message: string) => void;
}

export class OllamaEngine implements InferenceEngineAdapter {
  readonly engine = "ollama" as const;

  constructor(
    private readonly host: string,
    private readonly options: OllamaEngineOptions = {},
  ) {}

  async ensureReady(model: ModelInfo): Promise<void> {
    await this.assertReachable();

    if (await this.hasModel(model.ref)) return;

    if (this.options.autoPull) {
      await this.pullModel(model.ref);
      if (await this.hasModel(model.ref)) return;
    }

    throw new Error(
      `Model "${model.ref}" is not loaded in Ollama. Run: ollama pull ${model.ref} (or pass --pull).`,
    );
  }

  private async hasModel(ref: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(
      (entry) =>
        entry.name === ref ||
        entry.model === ref ||
        entry.name.startsWith(`${ref}:`),
    );
  }

  /** Pulls a model via Ollama, logging coarse progress as it streams. */
  private async pullModel(ref: string): Promise<void> {
    this.options.onStatus?.(`Pulling model "${ref}" via Ollama…`);
    const response = await fetch(`${this.host}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ref, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new Error(
        `Failed to pull "${ref}" (${response.status}). Pull it manually: ollama pull ${ref}`,
      );
    }

    let lastStatus = "";
    for await (const chunk of readNdjson(response.body)) {
      const status = typeof chunk.status === "string" ? chunk.status : "";
      if (status && status !== lastStatus) {
        lastStatus = status;
        this.options.onStatus?.(`  ${status}`);
      }
      if (chunk.error) {
        throw new Error(`Ollama pull error: ${String(chunk.error)}`);
      }
    }
  }

  async *streamCompletion(
    model: ModelInfo,
    messages: ChatMessage[],
    options?: { maxTokens?: number },
  ): AsyncGenerator<string, TokenUsage> {
    const response = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.ref,
        messages,
        stream: true,
        options: options?.maxTokens
          ? { num_predict: options.maxTokens }
          : undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }

    if (!response.body) {
      throw new Error("Ollama returned an empty response body.");
    }

    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of readNdjson(response.body)) {
      const message = chunk.message as { content?: string } | undefined;
      if (message?.content) {
        completionTokens += 1;
        yield message.content;
      }

      if (typeof chunk.prompt_eval_count === "number") {
        promptTokens = chunk.prompt_eval_count;
      }
      if (typeof chunk.eval_count === "number") {
        completionTokens = chunk.eval_count;
      }
    }

    return {
      promptTokens,
      completionTokens,
    };
  }

  private async assertReachable(): Promise<void> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama responded with ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `Ollama is not reachable at ${this.host}. Start Ollama before running nuro-worker.`,
        { cause: error },
      );
    }
  }

  private async listModels(): Promise<OllamaTagsResponse["models"]> {
    const response = await fetch(`${this.host}/api/tags`);
    const data = (await response.json()) as OllamaTagsResponse;
    return data.models ?? [];
  }
}

async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<
  Record<string, unknown>
> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      yield JSON.parse(trimmed) as Record<string, unknown>;
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    yield JSON.parse(trailing) as Record<string, unknown>;
  }
}
