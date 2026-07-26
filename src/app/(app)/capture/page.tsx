"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Volume2, Bookmark } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { Composer } from "@/components/capture/Composer";
import { BoAvatar } from "@/components/brand/Logo";
import { StatusBadge, CategoryBadge, InferredTag } from "@/components/ui/Badge";
import { useBo } from "@/lib/store/BoProvider";
import { extractClient, chatClient } from "@/lib/ai/client";
import { fallbackExtract } from "@/lib/ai/fallback";
import { boReply } from "@/lib/ai/reply";
import type { Extraction } from "@/lib/schemas";
import type { LifeItem } from "@/lib/types";
import { relativeDay, formatDate, todayIso } from "@/lib/utils";

interface ChatMsg {
  id: string;
  role: "user" | "bo";
  body: string;
  item?: LifeItem;
  extraction?: Extraction;
  engine?: "openai" | "fallback";
  decisionId?: string | null;
  saveTitle?: string;
  saved?: boolean;
}

const QUICK_PROMPTS = [
  "What should I watch on Friday night? Feeling a rom-com.",
  "Meal prep ideas for the week — cheap and quick.",
  "Help me plan a 7th birthday party, about $300.",
  "I need to sort my car rego soon.",
  "Find me an outdoor dining set under $2,000 that seats six.",
];

const SHOPPING_NOUNS =
  /\b(buy|find me|purchase|order|wardrobe|sofa|couch|dining set|table|tv|television|laptop|phone|dishwasher|washing machine|washer|fridge|desk|bike|mattress|headphones|camera)\b/i;

const ADMIN_CATS = new Set([
  "bill",
  "renewal",
  "appointment",
  "subscription",
  "document",
  "errand",
  "household",
  "family",
  "travel",
]);

// A clear, action-oriented admin signal — the only thing that should turn a
// message into a tracked task. Nouns alone (e.g. "netflix") are NOT enough.
const ADMIN_VERBS =
  /\b(pay|paid|renew|renewal|rego|registration|cancel|unsubscribe|book|booking|schedule|reschedule|appointment|remind me|reminder|due|overdue|invoice|bill(?:\sis|\sdue| for)|insurance|licence|license|passport|inspection|deadline|return by|sign and)\b/i;

// Conversational cues — recommendations, entertainment, planning, thinking. When
// present (and there's no clear admin action), Nook should just talk, not track.
const CHAT_CUES =
  /\b(watch|watched|watching|movie|movies|film|series|show|shows|netflix|stan|binge|stream|streaming|recommend|recommendation|suggest|idea|ideas|what should i|should i|which|pros and cons|compare|comparison|versus|vs\.?|meal|meals|dinner|lunch|breakfast|recipe|recipes|cook|plan a|planning|holiday|trip|vacation|party|think through|help me (decide|choose|think|plan|find|figure)|feeling|mood)\b/i;

type Kind = "task" | "shopping" | "chat";

function classify(text: string): { kind: Kind; extraction: Extraction } {
  const extraction = fallbackExtract(text, todayIso());

  // 1. A real purchase/shopping decision (has a budget or a concrete product).
  if (extraction.is_decision && (extraction.budget != null || SHOPPING_NOUNS.test(text))) {
    return { kind: "shopping", extraction };
  }

  // 2. A genuine life-admin task — only when there's a clear admin action or a
  //    concrete date. This stops "something on netflix" becoming a subscription.
  const hasAdminSignal = ADMIN_VERBS.test(text) || !!extraction.due_date;
  if (!extraction.is_decision && ADMIN_CATS.has(extraction.category) && hasAdminSignal) {
    return { kind: "task", extraction };
  }

  // 3. Everything else — recommendations, planning, thinking, chit-chat — is a
  //    conversation. Default to chat so Nook talks instead of over-filing.
  return { kind: "chat", extraction };
}

/** Render Nook's light markdown (**bold** and line breaks) safely. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block">
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

function SpeakButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  if (!supported) return null;
  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
    u.lang = "en-AU";
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return (
    <button
      onClick={toggle}
      aria-label={speaking ? "Stop speaking" : "Hear this"}
      title={speaking ? "Stop" : "Hear this"}
      className={`mt-1 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] ${
        speaking ? "text-eucalypt-700" : "text-ink-faint hover:text-eucalypt-700"
      }`}
    >
      <Volume2 size={13} /> {speaking ? "Stop" : "Hear it"}
    </button>
  );
}

function CapturePreview({ msg }: { msg: ChatMsg }) {
  const { item, extraction } = msg;
  if (!item || !extraction) return null;
  return (
    <div className="mt-2 rounded-2xl border border-eucalypt-200 bg-eucalypt-50/60 p-3">
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
          className="rounded-lg bg-eucalypt-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-eucalypt-700"
        >
          Open item
        </Link>
        {msg.decisionId && (
          <Link
            href={`/decisions/${msg.decisionId}`}
            className="rounded-lg border border-eucalypt-300 bg-white px-3 py-1.5 text-xs font-medium text-eucalypt-700 hover:bg-eucalypt-50"
          >
            View options
          </Link>
        )}
      </div>
    </div>
  );
}

function Bubble({ msg, onSave }: { msg: ChatMsg; onSave: (msg: ChatMsg) => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-eucalypt-600 px-3.5 py-2.5 text-sm text-white">
          {msg.body}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <BoAvatar size={28} />
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm text-ink shadow-soft">
          <RichText text={msg.body} />
        </div>
        <div className="flex items-center gap-2">
          <SpeakButton text={msg.body} />
          {msg.saveTitle && !msg.item && (
            <button
              onClick={() => onSave(msg)}
              disabled={msg.saved}
              className="mt-1 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-ink-faint hover:text-eucalypt-700 disabled:text-eucalypt-700"
            >
              <Bookmark size={13} /> {msg.saved ? "Saved" : "Save this"}
            </button>
          )}
        </div>
        <CapturePreview msg={msg} />
      </div>
    </div>
  );
}

function CaptureInner() {
  const { capture, data } = useBo();
  const params = useSearchParams();
  const tone = data.preferences.tone;
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "seed",
      role: "bo",
      body: `Hi ${data.preferences.preferred_name || "there"} — tell me anything on your mind. A task to handle, a decision to weigh up, or just "what should I watch tonight?"`,
    },
  ]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const saveThought = (msg: ChatMsg) => {
    const title = msg.saveTitle ?? "Thought for Nook";
    const userText = [...messages].reverse().find((m) => m.role === "user")?.body ?? title;
    const extraction: Extraction = {
      title,
      summary: "Saved from a chat with Nook.",
      category: "general",
      priority: "low",
      due_date: null,
      reminder_date: null,
      follow_up_date: null,
      missing_information: [],
      recommended_action: "Revisit whenever you like.",
      approval_required: false,
      confidence_score: 0.6,
      follow_up_question: null,
      is_decision: false,
      budget: null,
      currency: data.preferences.currency,
    };
    capture(userText, extraction);
    setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, saved: true } : x)));
  };

  const send = async (text: string) => {
    setBusy(true);
    const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: "user", body: text };
    setMessages((m) => [...m, userMsg]);

    try {
      const { kind } = classify(text);

      if (kind === "chat") {
        // Open-ended thinking / suggestions — Nook replies, no item created.
        const history = [...messages, userMsg]
          .filter((m) => m.id !== "seed")
          .slice(-8)
          .map(
            (m) =>
              ({
                role: (m.role === "bo" ? "assistant" : "user") as "assistant" | "user",
                content: m.body,
              }),
          );
        const { reply, saveTitle, engine } = await chatClient(history, tone, {
          preferredName: data.preferences.preferred_name,
          currency: data.preferences.currency,
          household: data.preferences.household_type,
          memories: data.memories.map((mem) => `${mem.label}: ${mem.value}`),
        });
        setMessages((m) => [
          ...m,
          { id: `m_${Date.now()}`, role: "bo", body: reply, saveTitle, engine },
        ]);
        return;
      }

      // Task or shopping — turn it into a structured item.
      const { extraction, engine } = await extractClient(text);
      const item = capture(text, extraction);
      setMessages((m) => [
        ...m,
        {
          id: `m_${Date.now()}`,
          role: "bo",
          body: boReply(extraction, tone),
          item,
          extraction,
          engine,
          decisionId: item.decision_request_id,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `err_${Date.now()}`, role: "bo", body: "Sorry, something went wrong — try again?" },
      ]);
    } finally {
      setBusy(false);
    }
  };

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
      <AppHeader title="Nook" />
      <div className="flex-1 overflow-y-auto">
        <div className="container-app space-y-4 py-4" aria-live="polite">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} onSave={saveThought} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-ink-faint">
              <BoAvatar size={28} />
              <span className="animate-pulse-soft">Nook is thinking…</span>
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
                className="rounded-full border border-eucalypt-200 bg-white px-3 py-1.5 text-xs text-ink-soft hover:bg-eucalypt-50"
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
