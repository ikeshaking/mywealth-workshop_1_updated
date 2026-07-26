"use client";

import { extractResponseSchema, type ExtractResponse, type PlannedReminder } from "../schemas";
import { fallbackExtract } from "./fallback";
import { demoSuggest } from "./suggest";
import { todayIso } from "../utils";
import type { BoTone } from "../types";

/**
 * Calls the secure /api/extract route from the browser. If the request fails
 * for any reason (offline, server error), it falls back to the local
 * deterministic parser so capture never breaks.
 */
export async function extractClient(input: string): Promise<ExtractResponse> {
  const today = todayIso();
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, today, currency: "AUD" }),
    });
    if (!res.ok) throw new Error("extract failed");
    const json = await res.json();
    return extractResponseSchema.parse(json);
  } catch {
    return { extraction: fallbackExtract(input, today), engine: "fallback" };
  }
}

export interface ChatClientResult {
  reply: string;
  saveTitle?: string;
  engine: "openai" | "fallback";
  /** Present when the OpenAI call failed — the exact reason, for diagnostics. */
  debug?: string;
}

export interface ChatClientContext {
  preferredName?: string;
  household?: string;
  currency?: string;
  memories?: string[];
}

/**
 * Calls the secure /api/chat route for Nook's open-ended thinking/suggestion
 * replies. Falls back to the local offline suggestion bank on any failure.
 */
export async function chatClient(
  history: { role: "user" | "assistant"; content: string }[],
  tone: BoTone,
  ctx: ChatClientContext = {},
): Promise<ChatClientResult> {
  const latest = history[history.length - 1]?.content ?? "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, tone, today: todayIso(), ...ctx }),
    });
    if (!res.ok) throw new Error("chat failed");
    return (await res.json()) as ChatClientResult;
  } catch {
    const fallback = demoSuggest(latest, tone);
    return { reply: fallback.reply, saveTitle: fallback.saveTitle, engine: "fallback" };
  }
}

/**
 * Turns a planning conversation (a checklist Nook wrote) into structured
 * reminders via the secure /api/plan route. Returns [] on any failure.
 */
export async function planClient(conversation: string): Promise<PlannedReminder[]> {
  try {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation, today: todayIso() }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { reminders?: PlannedReminder[] };
    return json.reminders ?? [];
  } catch {
    return [];
  }
}
