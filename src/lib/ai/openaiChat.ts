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

  const system = [
    "You are Nook — a warm, capable personal assistant who helps with everyday life: thinking things through, weighing pros and cons, comparing options, generating ideas, finding things, and planning (parties, holidays, meals, movie nights, purchases, life admin).",
    toneMeta[tone].system,
    "How you help:",
    "- When they want a recommendation, give a SHORT shortlist (2–4 options) with a clear best pick and a one-line why for each. Don't overwhelm.",
    "- When they're deciding, offer crisp pros/cons and a recommendation.",
    "- When they're planning, give a simple plan they can act on, and offer to go deeper or draft things.",
    "- Ask at most one short follow-up question when it genuinely helps.",
    "- Be concrete and practical. Use plain, everyday Australian English. Prices in the user's currency.",
    "- Never claim you have actually booked, bought or paid for anything.",
    ctx.preferredName ? `The user's name is ${ctx.preferredName}.` : "",
    ctx.household ? `Household: ${ctx.household}.` : "",
    ctx.currency ? `Currency: ${ctx.currency}.` : "",
    ctx.today ? `Today's date is ${ctx.today}.` : "",
    "Keep replies tight and scannable. Prefer short paragraphs and simple lists.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        { role: "system", content: system },
        ...history.map((t) => ({ role: t.role, content: t.content }) as const),
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
