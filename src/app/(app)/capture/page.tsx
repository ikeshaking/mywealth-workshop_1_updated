"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { Composer } from "@/components/capture/Composer";
import { MabelAvatar } from "@/components/brand/Logo";
import { StatusBadge, CategoryBadge, InferredTag } from "@/components/ui/Badge";
import { useMabel } from "@/lib/store/MabelProvider";
import { extractClient } from "@/lib/ai/client";
import { mabelReply } from "@/lib/ai/reply";
import type { Extraction } from "@/lib/schemas";
import type { LifeItem } from "@/lib/types";
import { relativeDay, formatDate } from "@/lib/utils";

interface ChatMsg {
  id: string;
  role: "user" | "mabel";
  body: string;
  item?: LifeItem;
  extraction?: Extraction;
  engine?: "openai" | "fallback";
  decisionId?: string | null;
}

const QUICK_PROMPTS = [
  "I need to sort my car rego soon.",
  "Remind me to pay my electricity bill tomorrow.",
  "Find me an outdoor dining set under £2,000 that seats six.",
  "I keep paying for a gym membership I don't use.",
  "I need to book the kids into the dentist.",
];

function CapturePreview({ msg }: { msg: ChatMsg }) {
  const { item, extraction } = msg;
  if (!item || !extraction) return null;
  return (
    <div className="mt-2 rounded-2xl border border-lavender-200 bg-lavender-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        <StatusBadge status={item.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={item.category} />
        {item.due_date && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
            📅 {formatDate(item.due_date)} · {relativeDay(item.due_date)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
          {Math.round(extraction.confidence_score * 100)}% sure
          {msg.engine === "fallback" && <InferredTag label="demo AI" />}
        </span>
      </div>
      {extraction.missing_information.length > 0 && (
        <p className="mt-2 text-xs text-ink-soft">
          Still needs: {extraction.missing_information.join(", ")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/items/${item.id}`}
          className="rounded-lg bg-lavender-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lavender-700"
        >
          Open item
        </Link>
        {msg.decisionId && (
          <Link
            href={`/decisions/${msg.decisionId}`}
            className="rounded-lg border border-lavender-300 bg-white px-3 py-1.5 text-xs font-medium text-lavender-700 hover:bg-lavender-50"
          >
            View options
          </Link>
        )}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-lavender-600 px-3.5 py-2.5 text-sm text-white">
          {msg.body}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <MabelAvatar size={28} />
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm text-ink shadow-soft">
          {msg.body}
        </div>
        <CapturePreview msg={msg} />
      </div>
    </div>
  );
}

function CaptureInner() {
  const { capture, data } = useMabel();
  const params = useSearchParams();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "seed",
      role: "mabel",
      body: `Hi ${data.preferences.preferred_name || "there"} — tell me anything on your mind and I'll turn it into something handled.`,
    },
  ]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const send = async (text: string) => {
    setBusy(true);
    const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: "user", body: text };
    setMessages((m) => [...m, userMsg]);
    try {
      const { extraction, engine } = await extractClient(text);
      const item = capture(text, extraction);
      const reply: ChatMsg = {
        id: `m_${Date.now()}`,
        role: "mabel",
        body: mabelReply(extraction),
        item,
        extraction,
        engine,
        decisionId: item.decision_request_id,
      };
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `err_${Date.now()}`, role: "mabel", body: "Sorry, something went wrong — try again?" },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Auto-send a prompt passed via ?q= (from the dashboard composer).
  useEffect(() => {
    const q = params.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader title="Mabel" />
      <div className="flex-1 overflow-y-auto">
        <div className="container-app space-y-4 py-4" aria-live="polite">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-ink-faint">
              <MabelAvatar size={28} />
              <span className="animate-pulse-soft">Mabel is thinking…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="container-app pb-2">
          <p className="mb-2 text-xs font-medium text-ink-faint">Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-lavender-200 bg-white px-3 py-1.5 text-xs text-ink-soft hover:bg-lavender-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="container-app border-t border-black/[0.04] bg-canvas py-3">
        <Composer onSend={send} busy={busy} autoFocus />
      </div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="container-app py-8 text-ink-faint">Loading…</div>}>
      <CaptureInner />
    </Suspense>
  );
}
