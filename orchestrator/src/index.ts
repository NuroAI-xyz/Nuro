import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env.js";
import { registerRoutes } from "./http/routes.js";
import { registerChatRoutes } from "./http/chat.js";
import { attachWorkerWs, resetStaleWorkers } from "./ws/server.js";

async function main() {
  const app = Fastify({
    logger: { level: env.isProd ? "info" : "debug" },
  });

  // Any localhost/127.0.0.1 origin is allowed regardless of port so Vite dev
  // port bumps (5173 -> 5174 ...) never break the /earn worker flow with a
  // CORS "Failed to fetch". Real domains are gated by ALLOWED_ORIGINS.
  const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  await app.register(cors, {
    origin(origin, cb) {
      // Non-browser callers (curl, server-to-server) send no Origin header.
      if (!origin || localhostOrigin.test(origin)) return cb(null, true);
      if (!env.allowedOrigins.length || env.allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  registerRoutes(app);
  registerChatRoutes(app);

  await app.ready();

  // Reset rows left 'online' by a previous process, then attach the WS server.
  await resetStaleWorkers().catch((err) =>
    app.log.warn({ err }, "resetStaleWorkers failed"),
  );
  attachWorkerWs(app.server);

  await app.listen({ port: env.port, host: "0.0.0.0" });
  app.log.info(
    `orchestrator ready - http :${env.port}  ·  ws :${env.port}/v1/worker`,
  );
}

main().catch((err) => {
  console.error("Fatal orchestrator error:", err);
  process.exit(1);
});
