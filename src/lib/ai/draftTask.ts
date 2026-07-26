import OpenAI from "openai";
import { draftSchema, type Draft } from "../schemas";

export interface DraftItemInput {
  title: string;
  summary?: string;
  category: string;
  context?: string;
  original_input?: string;
  recommended_action?: string;
}

/**
 * "Do the work": produce a ready-to-use draft for a task — usually an email or
 * message to send, or a tight step-by-step — so the user just has to act on it.
 * Returns null on any failure.
 */
export async function draftTask(
  item: DraftItemInput,
  name: string | undefined,
  today: string,
): Promise<Draft | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 3 });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = [
    `You help ${name || "the user"} actually get a life-admin task done by producing the single most useful, ready-to-use deliverable.`,
    today ? `Today's date is ${today}.` : "",
    "Decide what would help most, then produce exactly that:",
    "- Cancelling / disputing / enquiring → a short, polite email or message ready to send.",
    "- Booking / contacting someone → a concise message.",
    "- A multi-step task → a tight, ordered step-by-step or checklist.",
    'Return JSON only: { "label": short name for the draft (e.g. "Cancellation email"), "format": "email" | "message" | "steps" | "note", "body": the ready-to-use content }.',
    "Keep it concise and genuinely usable. Use [square-bracket placeholders] only where a detail is truly unknown. NEVER claim you have sent, paid, booked or done it — you are preparing it for them to send.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Task: ${item.title}`,
    item.summary ? `Summary: ${item.summary}` : "",
    `Category: ${item.category}`,
    item.context ? `Details: ${item.context}` : "",
    item.recommended_action ? `Suggested next step: ${item.recommended_action}` : "",
    item.original_input ? `They originally said: "${item.original_input}"` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
