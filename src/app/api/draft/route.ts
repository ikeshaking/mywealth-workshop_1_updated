import { NextResponse } from "next/server";
import { z } from "zod";
import { draftTask } from "@/lib/ai/draftTask";
import { todayIso } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

const draftRequestSchema = z.object({
  name: z.string().max(60).optional(),
  today: z.string().optional(),
  item: z.object({
    title: z.string().min(1).max(160),
    summary: z.string().max(600).optional(),
    category: z.string().max(40),
    context: z.string().max(600).optional(),
    original_input: z.string().max(600).optional(),
    recommended_action: z.string().max(400).optional(),
  }),
});

/**
 * POST /api/draft — Nook prepares a ready-to-use draft (email, message, steps)
 * so the user can actually complete the task, not just track it.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = draftRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, today, item } = parsed.data;
  const draft = await draftTask(item, name, today ?? todayIso());
  if (draft) {
    return NextResponse.json({ draft, engine: "openai" }, { status: 200 });
  }
  return NextResponse.json(
    {
      draft: null,
      engine: "fallback",
      error:
        "I couldn't draft this just now — this needs the real AI switched on (add an OpenAI key), or try again in a moment.",
    },
    { status: 200 },
  );
}
