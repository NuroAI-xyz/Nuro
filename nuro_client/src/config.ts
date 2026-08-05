import type { WorkerConfig } from "./types.js";

const DEFAULT_ORCHESTRATOR = "wss://orchestrator.nuroai.xyz/v1/worker";
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const DEFAULT_HEARTBEAT_MS = 30_000;

export function loadConfig(argv: string[] = process.argv.slice(2)): WorkerConfig {
  const args = parseArgs(argv);

  const token = args.token ?? process.env.NURO_TOKEN;
  if (!token) {
    throw new Error(
      "Worker token required. Sign in at https://nuroai.xyz, copy your worker token, then pass --token or set NURO_TOKEN.",
    );
  }

  const modelRef =
    args.model ?? process.env.NURO_MODEL ?? "qwen2.5:27b";
  const modelId = args["model-id"] ?? process.env.NURO_MODEL_ID ?? "nuro-max-27b";

  return {
    orchestratorUrl:
      args.orchestrator ??
      process.env.NURO_ORCHESTRATOR_URL ??
      DEFAULT_ORCHESTRATOR,
    token,
    workerClass: "native",
    executionMode: "single",
    model: {
      id: modelId,
      engine: "ollama",
      ref: modelRef,
    },
    ollamaHost:
      args["ollama-host"] ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    heartbeatIntervalMs: DEFAULT_HEARTBEAT_MS,
    autoPull: args.pull === "true" || process.env.NURO_AUTO_PULL === "1",
  };
}

function parseArgs(argv: string[]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }

    result[key] = next;
    i += 1;
  }

  return result;
}

export function printHelp(): void {
  console.log(`nuro-worker - Nuro AI native inference worker

Usage:
  nuro-worker --token <token> [options]

Options:
  --token           Worker token from nuroai.xyz (or NURO_TOKEN)  [required]
  --orchestrator    Orchestrator WebSocket URL (or NURO_ORCHESTRATOR_URL)
  --model           Ollama model ref, e.g. qwen2.5:27b (or NURO_MODEL)
  --model-id        Network model id advertised to orchestrator (or NURO_MODEL_ID)
  --ollama-host     Ollama API base URL (or OLLAMA_HOST)
  --pull            Pull the model via Ollama if it isn't installed
  --help            Show this help

Example:
  nuro-worker --token nuro_wk_... --model qwen2.5:27b --pull
`);
}
