import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/playground";
import { SiteFooter, SiteHeader } from "../components/layout/site-chrome";
import {
  streamChatCompletion,
  type ChatMessage,
} from "../lib/orchestrator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Playground - Inference API · Nuro AI" },
    {
      name: "description",
      content:
        "Chat with the Nuro private inference network. An OpenAI-compatible endpoint served by contributed GPUs.",
    },
  ];
}

const KEY_STORAGE = "nuro_playground_key";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY_STORAGE);
    if (saved) {
      setApiKey(saved);
      setKeyDraft(saved);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  const saveKey = useCallback(() => {
    const k = keyDraft.trim();
    setApiKey(k);
    if (k) window.localStorage.setItem(KEY_STORAGE, k);
    else window.localStorage.removeItem(KEY_STORAGE);
  }, [keyDraft]);

  const send = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || streaming || !apiKey) return;

    const history: ChatMessage[] = [
      ...turns.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: prompt },
    ];

    setInput("");
    setErr(null);
    setStreaming(true);
    setTurns((prev) => [
      ...prev,
      { role: "user", content: prompt },
      { role: "assistant", content: "" },
    ]);

    const append = (token: string) =>
      setTurns((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: last.content + token };
        }
        return next;
      });

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChatCompletion(
      apiKey,
      history,
      {
        onToken: append,
        onDone: () => setStreaming(false),
        onError: (m) => {
          setErr(m);
          setStreaming(false);
          // Drop the empty assistant turn on failure.
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant" && last.content === "") next.pop();
            return next;
          });
        },
      },
      { signal: controller.signal },
    );
  }, [input, streaming, apiKey, turns]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setTurns([]);
    setErr(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative flex flex-1 flex-col pt-20 pb-24 md:pt-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-caps">Inference API</p>
            <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              <span className="text-gradient">Playground</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#8a8a8a]">
              A chat agent running on the network. Every reply is streamed from a
              contributed GPU through the public API.
            </p>
          </div>
        </div>

        {/* API key bar */}
        <div className="mt-8 glass-panel rounded-[1.5rem] p-5 md:p-6">
          <label className="text-[13px] text-[#6f6f6f]">API key</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="nvqsk_…"
              spellCheck={false}
              type="password"
              className="w-full rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-[#4a4a4a]"
            />
            <button
              type="button"
              onClick={saveKey}
              className="btn-secondary shrink-0 px-6"
            >
              {apiKey && apiKey === keyDraft.trim() ? "Saved" : "Use key"}
            </button>
          </div>
          {!apiKey && (
            <p className="mt-3 text-[13px] text-[#8a8a8a]">
              Need a key? Create one on the{" "}
              <Link
                to="/earn"
                className="text-[#D4F3FF] underline-offset-4 hover:underline"
              >
                earn page
              </Link>
              . Your key is stored only in this browser.
            </p>
          )}
        </div>

        {/* Conversation */}
        <div
          ref={scrollRef}
          className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-[1.5rem] border border-white/[0.06] bg-black/30 p-5 md:p-7"
          style={{ minHeight: "38vh" }}
        >
          {turns.length === 0 ? (
            <div className="flex h-full min-h-[30vh] items-center justify-center text-center">
              <p className="max-w-sm text-sm text-[#6f6f6f]">
                {apiKey
                  ? "Ask anything. Responses stream token-by-token from an online worker."
                  : "Add an API key above to start chatting with the network."}
              </p>
            </div>
          ) : (
            turns.map((t, i) => <Bubble key={i} turn={t} />)
          )}
        </div>

        {err && <p className="mt-3 text-xs text-[#ff9b9b]">{err}</p>}

        {/* Composer */}
        <div className="mt-4 flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            disabled={!apiKey}
            placeholder={apiKey ? "Message the network…" : "Add an API key first"}
            className="min-h-[52px] max-h-40 w-full resize-y rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#4a4a4a] disabled:opacity-50"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="btn-secondary h-[52px] shrink-0 px-6"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={!apiKey || !input.trim()}
              className="btn-primary h-[52px] shrink-0 px-6 disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>

        {turns.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="mt-3 self-start text-xs text-[#6f6f6f] hover:text-[#8a8a8a]"
          >
            Clear conversation
          </button>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-white/[0.08] text-white"
            : "border border-white/[0.06] bg-black/40 text-[#c9c9c9]"
        }`}
      >
        {turn.content ? (
          <span className="whitespace-pre-wrap">{turn.content}</span>
        ) : (
          <span className="inline-flex gap-1 text-[#7ED6FF]">
            <span className="animate-pulse">●</span>
          </span>
        )}
      </div>
    </div>
  );
}
