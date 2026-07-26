import { NextResponse } from "next/server";
import { z } from "zod";
import { recommendAI } from "@/lib/ai/recommendAI";

export const runtime = "nodejs";
export const maxDuration = 30;

const recommendRequestSchema = z.object({
  request: z.string().min(1).max(2000),
  budget: z.number().nonnegative().nullable().default(null),
  currency: z.string().length(3).default("AUD"),
  preferences: z.array(z.string().max(120)).max(20).default([]),
});

/**
 * POST /api/recommend — real, relevant shopping/decision options via OpenAI.
 * Returns { result: null } when AI isn't available so the client can fall back
 * to the offline bundle bank.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = recommendRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { request, budget, currency, preferences } = parsed.data;
  const result = await recommendAI(request, budget, currency, preferences);
  return NextResponse.json({ result, engine: result ? "openai" : "fallback" }, { status: 200 });
}
