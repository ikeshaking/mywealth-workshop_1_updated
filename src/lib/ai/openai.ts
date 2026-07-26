import OpenAI from "openai";
import { extractionSchema, type Extraction } from "../schemas";
import { CATEGORIES, PRIORITIES } from "../types";

/**
 * OpenAI-backed extraction. Runs server-side only. Returns null (so the caller
 * can fall back) whenever a key is missing or anything goes wrong — the app
 * must never break because of the AI layer.
 */
export async function openaiExtract(
  input: string,
  today: string,
): Promise<Extraction | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = [
    "You are Nook, a calm, capable personal assistant.",
    "Convert the user's messy natural-language message into ONE structured life-admin item.",
    "Rules you MUST follow:",
    `- category is one of: ${CATEGORIES.join(", ")}.`,
    `- priority is one of: ${PRIORITIES.join(", ")}.`,
    "- NEVER invent a precise due_date, reminder_date, follow_up_date, or budget that the user did not give you. Use null when unknown.",
    "- Dates must be ISO YYYY-MM-DD. Resolve relative dates using today's date.",
    `- Today is ${today}.`,
    "- If a genuinely required detail is missing, list it in missing_information and write ONE short, supportive follow_up_question. Otherwise follow_up_question is null.",
    "- Set is_decision=true for research/shopping/choice requests (find, recommend, compare, best, repair-or-replace).",
    "- Parse budget only if the user stated one; else null. currency is a 3-letter code (default GBP).",
    "- approval_required=true when Nook would take an external action (payment, booking, cancellation, purchase).",
    "- confidence_score is 0..1 reflecting how sure you are of the classification.",
    "- Be supportive, never judgemental.",
    "Respond with a single JSON object only.",
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = extractionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
