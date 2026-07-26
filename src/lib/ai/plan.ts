import OpenAI from "openai";
import { plannedRemindersSchema, type PlannedReminder } from "../schemas";

/**
 * Turn a planning conversation (e.g. a moving checklist Nook just wrote) into a
 * clean, structured list of reminders with concrete dates. Uses OpenAI when
 * configured; returns [] on any failure so the caller can handle it gracefully.
 */
export async function planReminders(
  conversation: string,
  today: string,
): Promise<PlannedReminder[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return [];

  const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 3 });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = [
    "You convert a planning conversation into a clean list of actionable reminders.",
    `Today's date is ${today}. Resolve any relative timing ('early August', '2 weeks out', 'the week before') into concrete future dates.`,
    'Respond with JSON only, shaped exactly: { "reminders": [ { "title": string, "date": "YYYY-MM-DD" | null, "note": string } ] }.',
    "- title: short and actionable (e.g. 'Book removalist', 'Redirect mail'). No numbering or headings.",
    "- date: the day the user should act, as YYYY-MM-DD; use null only if truly undated.",
    "- note: one short line of helpful detail, or an empty string.",
    "Only include genuine tasks. Skip section headings, greetings and chit-chat. Keep it to the ~15 most useful.",
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: conversation },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = plannedRemindersSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    // Keep only reminders with a real title.
    return parsed.data.reminders.filter((r) => r.title.trim().length > 0);
  } catch {
    return [];
  }
}
