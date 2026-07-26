import { NextResponse } from "next/server";
import { z } from "zod";
import { openaiChat, type ChatTurn } from "@/lib/ai/openaiChat";
import { demoSuggest } from "@/lib/ai/suggest";
import { TONES } from "@/lib/tone";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
  tone: z.enum(TONES).default("calm"),
  preferredName: z.string().max(60).optional(),
  household: z.string().max(60).optional(),
  currency: z.string().length(3).optional(),
  today: z.string().optional(),
  memories: z.array(z.string().max(300)).max(50).optional(),
});

/**
 * POST /api/chat — Nook's open-ended "thinking partner" reply (movies, meals,
 * planning, pros/cons, ideas). Uses OpenAI when configured; otherwise falls
 * back to the offline suggestion bank so demo mode still feels useful.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { messages, tone, preferredName, household, currency, today, memories } = parsed.data;
  const history = messages as ChatTurn[];
  const latest = history[history.length - 1]?.content ?? "";

  const viaOpenAI = await openaiChat(history, tone, {
    preferredName,
    household,
    currency,
    today,
    memories,
  });

  if (viaOpenAI) {
    return NextResponse.json({ reply: viaOpenAI, engine: "openai" }, { status: 200 });
  }

  // A key is configured but the call failed — be honest rather than falling back
  // to the offline "tell me more" bank (which reads like Nook is stalling).
  if (process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        reply:
          "I hit a snag reaching my brain just then — mind sending that again in a moment? If it keeps happening, it's usually an OpenAI credit or rate-limit issue on the account.",
        engine: "fallback",
      },
      { status: 200 },
    );
  }

  // No key at all (demo mode) — use the offline suggestion bank.
  const fallback = demoSuggest(latest, tone);
  return NextResponse.json(
    { reply: fallback.reply, saveTitle: fallback.saveTitle, engine: "fallback" },
    { status: 200 },
  );
}
