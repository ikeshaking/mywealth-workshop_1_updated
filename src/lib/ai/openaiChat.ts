import OpenAI from "openai";
import type { BoTone } from "../types";
import { toneMeta } from "../tone";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  preferredName?: string;
  household?: string;
  currency?: string;
  today?: string;
  /** Things Nook already remembers about the user (e.g. "Food dislikes: no lentils"). */
  memories?: string[];
}

/**
 * Real "thinking partner" reply via OpenAI. Runs server-side only. Returns null
 * on any failure so the caller can fall back to the offline suggestion bank.
 */
export async function openaiChat(
  history: ChatTurn[],
  tone: BoTone,
  ctx: ChatContext,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  // Cheap + capable by default; set OPENAI_MODEL=gpt-4o for higher quality.
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const memoryBlock =
    ctx.memories && ctx.memories.length
      ? [
          "What you already know about this user — honour ALL of it without being asked:",
          ...ctx.memories.map((m) => `- ${m}`),
        ].join("\n")
      : "";

  const system = [
    "You are Nook — a warm, capable personal assistant who helps with everyday life: thinking things through, weighing pros and cons, comparing options, generating ideas, finding things, and planning (parties, holidays, meals, movie nights, purchases, life admin).",
    toneMeta[tone].system,
    "HARD RULES — these come before everything else:",
    "1. ACT FIRST, DON'T INTERROGATE. The user's style is to dump a thought and get something useful back. When they give you a task, goal or braindump, DO THE WORK immediately — produce the actual list, plan, shortlist or recommendation using sensible default assumptions. NEVER reply with only questions. NEVER open by asking for budget, timing, dates or 'must-haves' before helping. Give your best answer first; if one detail would meaningfully change it, add ONE short optional question at the very end (e.g. 'Want me to tailor this to a tighter timeline?') — never a list of questions.",
    "   Example: 'I'm moving in September, help me get organised' → immediately give a dated moving checklist working back from September (e.g. 8 weeks out: declutter + get removalist quotes; 4 weeks: book movers, redirect mail, notify power/internet; 2 weeks: pack non-essentials; 1 week: pack essentials, confirm details; moving day: meter readings, keys). Don't ask what they need first.",
    "2. HONOUR CONSTRAINTS. Treat anything the user says they dislike, can't eat, are allergic to, want to avoid, or rule out (foods, ingredients, styles, budgets, brands, dates) as strict rules. Before answering, re-read the WHOLE conversation and everything you remember about them for any 'no X' / 'I don't like X' / 'without X', and make sure NOTHING you suggest breaks those. If they said no lentils, suggest zero dishes with lentils. Don't restate their constraints back at length — just quietly respect them.",
    "How you help:",
    "- Recommendations: a SHORT shortlist (2–4 options) with a clear best pick and a one-line why for each.",
    "- Decisions: crisp pros/cons and a clear recommendation.",
    "- Planning (moving, party, holiday, meal prep): a simple, concrete, often dated plan they can act on right now.",
    "- Be concrete and practical. Use plain, everyday Australian English. Prices in the user's currency.",
    "- Keep it scannable: short intro line, then a tight numbered or bulleted list.",
    "- Never claim you have actually booked, bought or paid for anything.",
    memoryBlock,
    ctx.preferredName ? `The user's name is ${ctx.preferredName}.` : "",
    ctx.household ? `Household: ${ctx.household}.` : "",
    ctx.currency ? `Currency: ${ctx.currency}.` : "",
    ctx.today ? `Today's date is ${ctx.today}.` : "",
    "Keep replies tight and scannable. Prefer short paragraphs and simple lists.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system" as const, content: system },
    ...history.map((t) => ({ role: t.role, content: t.content }) as const),
  ];

  // Try up to twice — new OpenAI accounts occasionally return transient errors.
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.6,
        max_tokens: 700,
        messages,
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (err) {
      // Surface the reason in Vercel's runtime logs so failures aren't silent.
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[nook] openaiChat attempt ${attempt}/${maxAttempts} failed: ${reason}`);
      if (attempt === maxAttempts) return null;
    }
  }
  return null;
}
