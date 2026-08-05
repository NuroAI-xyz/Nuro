# @nuroaixyz/worker

Worker software every Nuro contributor runs - native CLI (Ollama) and browser worker (WebLLM). Published to npm; run the native worker with `npx @nuroaixyz/worker --token YOUR_TOKEN`.

## Modes

| Mode | Status | Description |
|------|--------|-------------|
| **Single-node** | v1 (now) | Full prompt → local forward pass → stream tokens to orchestrator |
| **Swarm** | v2 (later) | Layer-block pipeline via `nuro-swarm` - see `SwarmWorker` stub |

## Native worker (Ollama)

Requires [Ollama](https://ollama.com) running locally with your model pulled:

```bash
ollama pull qwen2.5:27b
```

Get your worker token by signing in at [nuroai.xyz](https://nuroai.xyz) (email or X), then:

```bash
pnpm install
pnpm --filter @nuroaixyz/worker build

# Development (tsx)
pnpm --filter @nuroaixyz/worker dev -- --token YOUR_TOKEN --model qwen2.5:27b --pull

# Production binary
pnpm --filter @nuroaixyz/worker start -- --token YOUR_TOKEN

# Published
npx @nuroaixyz/worker --token YOUR_TOKEN
```

### CLI options

| Flag / env | Default | Description |
|------------|---------|-------------|
| `--token` / `NURO_TOKEN` | - | Worker token from nuroai.xyz (required) |
| `--orchestrator` / `NURO_ORCHESTRATOR_URL` | `wss://orchestrator.nuroai.xyz/v1/worker` | Orchestrator WebSocket |
| `--model` / `NURO_MODEL` | `qwen2.5:27b` | Ollama model ref |
| `--model-id` / `NURO_MODEL_ID` | `nuro-max-27b` | Model id advertised to network |
| `--ollama-host` / `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama API base URL |
| `--pull` / `NURO_AUTO_PULL=1` | off | Pull the model via Ollama if it isn't installed |

The token is sent both as an `Authorization: Bearer` header on the WebSocket
handshake and inside the `register` payload.

## Browser worker (WebLLM)

Runs a smaller model in-tab over WebGPU via [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm).
Import from the browser subpath inside `nuroai.xyz`:

```typescript
import { createBrowserWorker } from "@nuroaixyz/worker/browser";

const worker = await createBrowserWorker({
  orchestratorUrl: "wss://orchestrator.nuroai.xyz/v1/worker",
  token: session.workerToken,            // from the signed-in Privy session
  model: {
    id: "nuro-browser-8b",
    engine: "webllm",
    ref: "Qwen2.5-7B-Instruct-q4f16_1-MLC", // WebLLM prebuilt model id
  },
  onProgress: (p) => console.log(`loading ${(p.progress * 100) | 0}% - ${p.text}`),
  onStatus: (s) => console.log(s),
});

await worker.start(); // downloads/compiles the model, then serves jobs
```

The first run downloads and compiles the model into the browser cache; later
runs are instant. Use `WebLLMEngine` / `createWebLLMEngine` directly if you want
to manage the engine yourself and pass it via `BrowserWorkerOptions.engine`.

## Orchestrator protocol

WebSocket messages between worker and `nuro-orchestrator`:

**Worker → orchestrator**

- `register` - token, GPU specs, model, worker class
- `heartbeat` - liveness
- `job_token` - streamed output token
- `job_complete` - token usage for billing
- `job_error` - failed job

**Orchestrator → worker**

- `registered` - assigned worker id
- `job` - prompt + messages
- `ping` / `pong`

No prompt or response bodies are retained by the client after the job completes.

## Engines

| Engine | Worker | Source |
|--------|--------|--------|
| Ollama | Native | [ollama.com/library](https://ollama.com/library) |
| vLLM | Native (future) | Hugging Face weights + [vLLM](https://github.com/vllm-project/vllm) |
| WebLLM | Browser | [MLC WebLLM](https://github.com/mlc-ai/web-llm) |

## Install command (website copy-paste)

```bash
curl -fsSL https://nuroai.xyz/install.sh | bash -s -- --token YOUR_TOKEN
```

*(Install script not shipped yet - run via pnpm until the curl installer lands.)*
