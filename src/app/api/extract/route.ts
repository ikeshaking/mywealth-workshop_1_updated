import { NextResponse } from "next/server";
import { extractRequestSchema } from "@/lib/schemas";
import { extract } from "@/lib/ai/extract";
import { todayIso } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/extract
 *
 * Secure, server-side natural-language → structured-item extraction. The
 * OpenAI key (if any) is only read here and never reaches the browser. With no
 * key configured the deterministic fallback parser runs, so the endpoint always
 * responds successfully — that's what keeps demo mode fully functional.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = extractRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { input, today } = parsed.data;
  const result = await extract(input, today ?? todayIso());
  return NextResponse.json(result, { status: 200 });
}
