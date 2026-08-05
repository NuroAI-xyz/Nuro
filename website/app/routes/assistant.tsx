import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { Route } from "./+types/assistant";
import { SiteHeader } from "../components/layout/site-chrome";
import { AssistantMascot } from "../components/assistant/mascot";
// Client-only: the paywall pulls in browser-only Solana wallet code
// (@privy-io/react-auth/solana), which must never enter the SSR server bundle.
const Paywall = lazy(() =>
  import("../components/assistant/paywall").then((m) => ({
    default: m.Paywall,
  })),
);
import {
  EMPTY_ENTITLEMENTS,
  PaywallError,
  fetchEntitlements,
  streamAssistant,
  type AssistantMessage,
  type ContentPart,
  type Entitlements,
} from "../lib/assistant";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Assistant · Nuro AI" },
    {
      name: "description",
      content:
        "Chat with the Nuro assistant. Five free messages, then credits — paid in USDC (and $NURO at launch) — power the in-app AI.",
    },
  ];
}

interface Attachment {
  url: string; // data URL
  name: string;
}
interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  images?: string[];
}

const MAX_IMAGES = 4;
const MAX_BYTES = 4 * 1024 * 1024;

function buildApiMessages(history: Msg[]): AssistantMessage[] {
  return history
    .filter((m) => m.text.trim() !== "" || (m.images?.length ?? 0) > 0)
    .map((m) => {
      if (m.role === "user" && m.images && m.images.length > 0) {
        const parts: ContentPart[] = m.images.map((url) => ({
          type: "image_url",
          image_url: { url },
        }));
        if (m.text.trim()) parts.push({ type: "text", text: m.text });
        return { role: "user", content: parts };
      }
      return { role: m.role, content: m.text };
    });
}

export default function AssistantPage() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [attach, setAttach] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ent, setEnt] = useState<Entitlements>(EMPTY_ENTITLEMENTS);
  const [paywall, setPaywall] = useState(false);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (authenticated) void fetchEntitlements().then(setEnt);
  }, [authenticated]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  const appendToken = useCallback((token: string) => {
    setMsgs((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant")
        next[next.length - 1] = { ...last, text: last.text + token };
      return next;
    });
  }, []);

  const send = useCallback(async () => {
    if (!authenticated) {
      void login();
      return;
    }
    const prompt = input.trim();
    if ((!prompt && attach.length === 0) || streaming) return;
    if (ent.totalRemaining <= 0) {
      setPaywall(true);
      return;
    }

    const accessToken = await getAccessToken();

    const images = attach.map((a) => a.url);
    const savedInput = input;
    const savedAttach = attach;
    const userMsg: Msg = { id: ++idRef.current, role: "user", text: prompt, images };
    const history = [...msgs, userMsg];

    setMsgs((prev) => [
      ...prev,
      userMsg,
      { id: ++idRef.current, role: "assistant", text: "" },
    ]);
    setInput("");
    setAttach([]);
    setErr(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const restore = () => {
      // drop the trailing (assistant, user) pair and restore the composer
      setMsgs((prev) => prev.slice(0, -2));
      setInput(savedInput);
      setAttach(savedAttach);
    };

    try {
      await streamAssistant(
        buildApiMessages(history),
        {
          onToken: appendToken,
          onDone: (e) => {
            if (e) setEnt(e);
            setStreaming(false);
          },
          onError: (m) => {
            setErr(m);
            setStreaming(false);
            setMsgs((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant" && last.text === "") next.pop();
              return next;
            });
          },
        },
        { signal: controller.signal, accessToken },
      );
    } catch (e) {
      setStreaming(false);
      if (e instanceof PaywallError) {
        setEnt(e.entitlements);
        restore();
        setPaywall(true);
      } else {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    }
  }, [
    input,
    attach,
    streaming,
    ent.totalRemaining,
    msgs,
    appendToken,
    authenticated,
    login,
    getAccessToken,
  ]);

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const room = MAX_IMAGES - attach.length;
      const chosen = Array.from(files)
        .filter((f) => f.type.startsWith("image/") && f.size <= MAX_BYTES)
        .slice(0, room);
      if (chosen.length < Array.from(files).length) {
        setErr(`Images must be under 4MB, up to ${MAX_IMAGES} at a time.`);
      }
      chosen.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () =>
          setAttach((prev) => [
            ...prev,
            { url: String(reader.result), name: file.name },
          ]);
        reader.readAsDataURL(file);
      });
    },
    [attach.length],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);
  const reset = useCallback(() => {
    setMsgs([]);
    setErr(null);
  }, []);

  const empty = msgs.length === 0;
  const locked = !authenticated;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-black">
      <SiteHeader />
      <main className="page-shell relative flex flex-1 flex-col pt-6 pb-6">
        {/* status bar */}
        <div className="flex items-center justify-between gap-3 py-2">
          {authenticated ? (
            <EntitlementPill ent={ent} onBuy={() => setPaywall(true)} />
          ) : (
            <span />
          )}
          {authenticated && !empty && (
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[#6f6f6f] transition hover:text-[#c9c9c9]"
            >
              New chat
            </button>
          )}
        </div>

        {locked ? (
          <div className="flex flex-1 flex-col items-center justify-center pb-6">
            <AssistantMascot />
            <h1 className="mt-7 text-center text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              <span className="text-white">Sign in to chat</span>
              <br />
              <span className="text-gradient">with Nuro</span>
            </h1>
            <p className="mt-4 max-w-sm text-center text-[15px] leading-relaxed text-[#8a8a8a]">
              Log in to start chatting. Every account gets{" "}
              {EMPTY_ENTITLEMENTS.freeLimit} free messages, then credits keep the
              network running.
            </p>
            <button
              type="button"
              disabled={!ready}
              onClick={() => void login()}
              className="btn-primary mt-8 px-8 disabled:opacity-40"
            >
              {ready ? "Log in to continue" : "Loading…"}
            </button>
          </div>
        ) : empty ? (
          <div className="flex flex-1 flex-col items-center justify-center pb-6">
            <AssistantMascot />
            <h1 className="mt-7 text-center text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              <span className="text-white">What can I</span>
              <br />
              <span className="text-gradient">help you build?</span>
            </h1>
            <div className="mt-9 w-full max-w-2xl">
              <Composer
                input={input}
                setInput={setInput}
                attach={attach}
                onFiles={onFiles}
                removeAttach={(i) =>
                  setAttach((p) => p.filter((_, idx) => idx !== i))
                }
                onSend={() => void send()}
                streaming={streaming}
                onStop={stop}
                autoFocus
              />
            </div>
            {err && <p className="mt-3 text-xs text-[#ff9b9b]">{err}</p>}
            <p className="mt-6 text-center text-[12px] text-[#5c5c5c]">
              Nuro can make mistakes. Double-check important information.
            </p>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 space-y-5 overflow-y-auto rounded-[1.5rem] border border-white/[0.06] bg-black/30 p-5 md:p-7"
              style={{ minHeight: "46vh" }}
            >
              {msgs.map((m) => (
                <Bubble key={m.id} msg={m} />
              ))}
            </div>
            {err && <p className="mt-3 text-xs text-[#ff9b9b]">{err}</p>}
            <div className="mt-4">
              <Composer
                input={input}
                setInput={setInput}
                attach={attach}
                onFiles={onFiles}
                removeAttach={(i) =>
                  setAttach((p) => p.filter((_, idx) => idx !== i))
                }
                onSend={() => void send()}
                streaming={streaming}
                onStop={stop}
              />
            </div>
          </>
        )}
      </main>

      {mounted && (
        <Suspense fallback={null}>
          <Paywall
            open={paywall}
            onClose={() => setPaywall(false)}
            entitlements={ent}
            onCredited={(e) => {
              setEnt(e);
              setPaywall(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

function EntitlementPill({
  ent,
  onBuy,
}: {
  ent: Entitlements;
  onBuy: () => void;
}) {
  const low = ent.totalRemaining <= 1;
  const label =
    ent.credits > 0
      ? `${ent.credits} credit${ent.credits === 1 ? "" : "s"}`
      : `${ent.freeRemaining}/${ent.freeLimit} free`;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] ${
          low
            ? "border-[#c9a24a]/40 bg-[#c9a24a]/[0.08] text-[#e6c56a]"
            : "border-white/[0.1] bg-white/[0.03] text-[#c9c9c9]"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#7ED6FF]" />
        {label}
      </span>
      <button
        type="button"
        onClick={onBuy}
        className="rounded-full border border-white/[0.12] px-3 py-1.5 text-[12px] text-white transition hover:border-white/30"
      >
        Get credits
      </button>
    </div>
  );
}

function Composer({
  input,
  setInput,
  attach,
  onFiles,
  removeAttach,
  onSend,
  streaming,
  onStop,
  autoFocus,
}: {
  input: string;
  setInput: (v: string) => void;
  attach: Attachment[];
  onFiles: (f: FileList | null) => void;
  removeAttach: (i: number) => void;
  onSend: () => void;
  streaming: boolean;
  onStop: () => void;
  autoFocus?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="glass-panel rounded-[1.4rem] border border-white/[0.1] bg-black/50 p-3">
      {attach.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attach.map((a, i) => (
            <div key={i} className="relative">
              <img
                src={a.url}
                alt={a.name}
                className="h-16 w-16 rounded-lg border border-white/[0.1] object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttach(i)}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black text-white shadow"
                aria-label="Remove image"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#8a8a8a] transition hover:bg-white/[0.05] hover:text-white"
          aria-label="Attach image"
          title="Attach image"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <textarea
          value={input}
          autoFocus={autoFocus}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!streaming) onSend();
            }
          }}
          rows={1}
          placeholder="Ask anything, or attach an image…"
          className="max-h-40 min-h-[40px] w-full resize-none bg-transparent px-1 py-2 text-[15px] text-white outline-none placeholder:text-[#5c5c5c]"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.1] text-white transition hover:bg-white/[0.16]"
            aria-label="Stop"
          >
            <span className="h-3 w-3 rounded-[3px] bg-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() && attach.length === 0}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-black transition hover:bg-[#e8e8e8] disabled:opacity-30"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
          isUser
            ? "bg-white/[0.08] text-white"
            : "border border-white/[0.06] bg-black/40 text-[#d4d4d4]"
        }`}
      >
        {msg.images && msg.images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {msg.images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="max-h-48 rounded-lg border border-white/[0.1] object-cover"
              />
            ))}
          </div>
        )}
        {msg.text ? (
          <span className="whitespace-pre-wrap">{msg.text}</span>
        ) : (
          <span className="inline-flex gap-1 text-[#7ED6FF]">
            <span className="animate-pulse">●</span>
          </span>
        )}
      </div>
    </div>
  );
}
