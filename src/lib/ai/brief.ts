import OpenAI from "openai";
import type { BoTone } from "../types";
import { toneMeta } from "../tone";

export interface BriefItem {
  title: string;
  category: string;
  status: string;
  due_date: string | null;
}

export interface BriefContext {
  name?: string;
  today?: string;
  tone?: BoTone;
  items: BriefItem[];
  memories?: string[];
}

/**
 * A warm, personal daily brief generated from the user's real tracked items and
 * what Nook remembers about them. Returns null on any failure so the caller can
 * fall back to a simple templated brief.
 */
export async function generateBrief(ctx: BriefContext): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 3 });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const itemLines = ctx.items.length
    ? ctx.items
        .map(
          (i) =>
            `- ${i.title} [${i.category}, ${i.status}${i.due_date ? `, due ${i.due_date}` : ""}]`,
        )
        .join("\n")
    : "(no tracked items yet)";

  const system = [
    `You are Nook, writing a short, warm daily brief for ${ctx.name || "the user"}.`,
    ctx.today ? `Today's date is ${ctx.today}.` : "",
    ctx.tone ? toneMeta[ctx.tone].system : "",
    "Write 3–5 short, scannable lines:",
    "- A warm one-line opener for this time of day.",
    "- What genuinely needs them today or very soon — reference specific items by name; flag anything with a near due date.",
    "- The ONE thing worth doing first.",
    "- A calm, encouraging closing line.",
    "Rules: NEVER invent items or dates that aren't listed below. If nothing is pressing, reassure them it's a calm day and suggest one small get-ahead action. Plain, everyday Australian English. No headings or markdown symbols other than a leading '•' for list lines. Keep it tight.",
    ctx.memories && ctx.memories.length
      ? `What you know about them:\n${ctx.memories.map((m) => `- ${m}`).join("\n")}`
      : "",
    `Their current tracked items:\n${itemLines}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.6,
      max_tokens: 350,
      messages: [
        { role: "system", content: system },
        { role: "user", content: "Write today's brief." },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
