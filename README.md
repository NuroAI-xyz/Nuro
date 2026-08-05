# Nuro AI

Inference network powered by contributed compute - [nuroai.xyz](https://nuroai.xyz)

| Package | Domain / role | Purpose |
|---------|---------------|---------|
| `nuro-website` | [nuroai.xyz](https://nuroai.xyz) | Landing page + app (`/earn`, staking, API) |
| `nuro-data` | [data.nuroai.xyz](https://data.nuroai.xyz) | Public network data and analytics |
| `@nuroaixyz/worker` | CLI / browser library (npm) | Contributor worker (Ollama native, WebLLM browser) |
| `@nuro/orchestrator` | [orchestrator.nuroai.xyz](https://orchestrator.nuroai.xyz) | Worker control plane: WebSocket, worker tokens, job dispatch + metering (Supabase) |

## Development

```bash
pnpm install

# Main site
pnpm --filter nuro-website dev

# Data dashboard
pnpm --filter nuro-data dev

# Orchestrator (worker control plane; needs Supabase + Privy env - see orchestrator/.env.example)
pnpm --filter @nuro/orchestrator dev

# Native worker (requires a worker token from /earn + Ollama)
pnpm --filter @nuroaixyz/worker dev -- --token YOUR_TOKEN --model qwen2.5:27b --pull
```

## Build

```bash
pnpm --filter nuro-website build
pnpm --filter nuro-data build
pnpm --filter @nuroaixyz/worker build
```
