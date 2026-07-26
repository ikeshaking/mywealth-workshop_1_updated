import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBrief } from "@/lib/ai/brief";
import { TONES } from "@/lib/tone";
import { todayIso } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

const briefRequestSchema = z.object({
  name: z.string().max(60).optional(),
  today: z.string().optional(),
  tone: z.enum(TONES).optional(),
  items: z
    .array(
      z.object({
        title: z.string().max(160),
        category: z.string().max(40),
        status: z.string().max(40),
        due_date: z.string().nullable().default(null),
      }),
    )
    .max(60)
    .default([]),
  memories: z.array(z.string().max(300)).max(50).optional(),
});

/**
 * POST /api/brief — Nook's proactive daily brief. Uses OpenAI when configured;
 * otherwise returns a simple templated brief so the dashboard always has one.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = briefRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, today, tone, items, memories } = parsed.data;
  const brief = await generateBrief({ name, today: today ?? todayIso(), tone, items, memories });
  if (brief) {
    return NextResponse.json({ brief, engine: "openai" }, { status: 200 });
  }

  // Fallback: a simple, honest templated brief from the item statuses.
  const attention = items.filter((i) =>
    ["needs_attention", "needs_information", "ready_for_approval"].includes(i.status),
  );
  const upcoming = items.filter((i) => i.status === "scheduled");
  const lines: string[] = [`Here's your day${name ? `, ${name}` : ""}.`];
  if (attention.length) {
    lines.push(
      `• ${attention.length} thing${attention.length > 1 ? "s" : ""} need${attention.length > 1 ? "" : "s"} you: ${attention
        .slice(0, 3)
        .map((i) => i.title)
        .join(", ")}.`,
    );
  }
  if (upcoming.length) {
    lines.push(`• ${upcoming.length} coming up, including ${upcoming[0].title}.`);
  }
  if (!attention.length && !upcoming.length) {
    lines.push("Nothing pressing — a calm one. Maybe get ahead on one small thing.");
  } else {
    lines.push(`Start with: ${(attention[0] ?? upcoming[0]).title}.`);
  }
  return NextResponse.json({ brief: lines.join("\n"), engine: "fallback" }, { status: 200 });
}
