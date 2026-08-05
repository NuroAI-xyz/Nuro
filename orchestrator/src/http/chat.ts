import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { verifyApiKey } from "../auth/api-keys.js";
import { checkConsumerEligibility, recordConsumerUsage } from "../billing.js";
import { dispatchJob } from "../jobs.js";
import { registry } from "../registry.js";
import type { TokenUsage } from "../protocol.js";

const chatBody = z.object({
  model: z.string().max(200).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  stream: z.boolean().optional(),
  max_tokens: z.number().int().positive().max(4096).optional(),
});

// Give a worker up to this long to finish before we give up on the request.
const JOB_TIMEOUT_MS = 120_000;

/** Register the public, API-key-authenticated inference API (OpenAI-compatible). */
export function registerChatRoutes(app: FastifyInstance): void {
  app.post("/v1/chat/completions", async (req, reply) => {
    const auth = await verifyApiKey(bearer(req.headers.authorization));
    if (!auth) {
      return reply
        .code(401)
        .send(openaiError("Invalid API key.", "invalid_request_error", 401));
    }

    let body: z.infer<typeof chatBody>;
    try {
      body = chatBody.parse(req.body);
    } catch (err) {
      const issues = err instanceof z.ZodError ? err.issues : undefined;
      return reply
        .code(400)
        .send(openaiError("Invalid request body.", "invalid_request_error", 400, issues));
    }

    // Consumer billing gate: 5 free requests, then requires credits.
    // Disabled in dev (localhost) so it's always free there.
    const eligibility = await checkConsumerEligibility(auth.userId);
    if (!eligibility.allowed) {
      return reply
        .code(402)
        .send(
          openaiError(
            eligibility.reason ?? "Payment required.",
            "insufficient_credits",
            402,
          ),
        );
    }

    const worker = registry.pickAvailable({ model: body.model });
    if (!worker) {
      return reply
        .code(503)
        .send(
          openaiError(
            "No workers are online to serve this request. Try again shortly.",
            "no_workers_available",
            503,
          ),
        );
    }

    const servedModel =
      worker.model?.ref ?? worker.model?.id ?? body.model ?? "nuro-default";
    const id = `chatcmpl-${randomBytes(12).toString("hex")}`;
    const created = Math.floor(Date.now() / 1000);
    const stream = body.stream === true;

    if (stream) {
      openStream(reply);
      const firstChunk = chunk(id, created, servedModel, { role: "assistant" }, null);
      writeData(reply, firstChunk);
    }

    let content = "";

    await new Promise<void>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => finishError("Inference timed out."), JOB_TIMEOUT_MS);

      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };

      const finishError = (message: string) => {
        if (settled) return;
        if (stream) {
          writeData(reply, chunk(id, created, servedModel, {}, "error"));
          writeDone(reply);
          reply.raw.end();
        } else {
          void reply.code(502).send(openaiError(message, "inference_error", 502));
        }
        done();
      };

      void dispatchJob({
        worker,
        model: servedModel,
        messages: body.messages,
        maxTokens: body.max_tokens,
        requesterId: auth.userId,
        onToken: (token) => {
          content += token;
          if (stream) {
            writeData(reply, chunk(id, created, servedModel, { content: token }, null));
          }
        },
        onDone: (usage) => {
          if (settled) return;
          // Meter the consumer: consume a free request or deduct credits.
          void recordConsumerUsage(
            auth.userId,
            eligibility.mode,
            usage,
            servedModel,
            id,
          );
          if (stream) {
            writeData(reply, chunk(id, created, servedModel, {}, "stop"));
            writeDone(reply);
            reply.raw.end();
          } else {
            void reply.send(completion(id, created, servedModel, content, usage));
          }
          done();
        },
        onError: (message) => finishError(message || "Inference failed."),
      }).catch((err: unknown) => {
        finishError(err instanceof Error ? err.message : "Dispatch failed.");
      });
    });
  });
}

function bearer(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : null;
}

interface Delta {
  role?: "assistant";
  content?: string;
}

function chunk(
  id: string,
  created: number,
  model: string,
  delta: Delta,
  finishReason: "stop" | "error" | null,
) {
  return {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

function completion(
  id: string,
  created: number,
  model: string,
  content: string,
  usage: TokenUsage,
) {
  const prompt = usage.promptTokens || 0;
  const completionTokens = usage.completionTokens || 0;
  return {
    id,
    object: "chat.completion",
    created,
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: prompt,
      completion_tokens: completionTokens,
      total_tokens: prompt + completionTokens,
    },
  };
}

function openaiError(
  message: string,
  type: string,
  code: number,
  issues?: unknown,
) {
  return { error: { message, type, code, ...(issues ? { issues } : {}) } };
}

function openStream(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  reply.hijack();
}

function writeData(reply: FastifyReply, obj: unknown): void {
  reply.raw.write(`data: ${JSON.stringify(obj)}\n\n`);
}

function writeDone(reply: FastifyReply): void {
  reply.raw.write("data: [DONE]\n\n");
}
