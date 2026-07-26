import { NextResponse } from "next/server";
import { z } from "zod";
import { planReminders } from "@/lib/ai/plan";
import { todayIso } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

const planRequestSchema = z.object({
  conversation: z.string().min(1).max(8000),
  today: z.string().optional(),
});

/**
 * POST /api/plan — turn a planning conversation into structured reminders that
 * the app can save as tracked items with dates.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = planRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const reminders = await planReminders(parsed.data.conversation, parsed.data.today ?? todayIso());
  return NextResponse.json({ reminders }, { status: 200 });
}
