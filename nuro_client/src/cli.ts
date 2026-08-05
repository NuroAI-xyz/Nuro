#!/usr/bin/env node

import { loadConfig, printHelp } from "./config.js";
import { createEngine } from "./engines/index.js";
import { SingleNodeWorker } from "./worker/single-node-worker.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  const config = loadConfig(argv);
  const engine = createEngine(config.model, {
    ollamaHost: config.ollamaHost,
    autoPull: config.autoPull,
    onStatus: (message) => console.log(`[nuro-worker] ${message}`),
  });
  const worker = new SingleNodeWorker(config, engine);

  const shutdown = () => {
    console.log("[nuro-worker] Shutting down...");
    worker.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[nuro-worker] Starting native worker...");
  console.log(`[nuro-worker] Model: ${config.model.ref} (${config.model.id})`);
  console.log(`[nuro-worker] Token: ${maskToken(config.token)}`);
  console.log(`[nuro-worker] Orchestrator: ${config.orchestratorUrl}`);

  await worker.start();
}

function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

main().catch((error) => {
  console.error(
    `[nuro-worker] Fatal: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
