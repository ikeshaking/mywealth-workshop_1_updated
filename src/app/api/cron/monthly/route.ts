import { NextResponse } from "next/server";
import { buildMonthlySummary, monthlyDedupeKey, type CandidateSnapshot } from "@/lib/py/digest";
import { sendEmail } from "@/lib/email/send";
import {
  adminClient,
  appUrl,
  candidatesFor,
  cronAuthorised,
  loadProgramData,
  prefsFor,
  recordSent,
  sentKeys,
  toRecipient,
} from "@/lib/py/serverData";

/**
 * Monthly job (see vercel.json — runs at the start of each month). Sends every
 * candidate, supervisor and PY manager a summary of the month just gone:
 * progress, highlights, what's outstanding and anything tracking behind.
 *
 * The dedupe key is the summarised month (e.g. "monthly:2026-07"), so the job is
 * safe to retry and can never send two summaries for the same month.
 */
export async function POST(req: Request) {
  if (!cronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  const sb = adminClient();
  if (!sb) {
    return NextResponse.json(
      { skipped: true, reason: "Supabase is not configured; notifications need live mode." },
      { status: 200 },
    );
  }

  const url = appUrl(req);
  const now = new Date();
  const dedupeKey = monthlyDedupeKey(now);
  const data = await loadProgramData(sb);

  let sent = 0;
  const errors: string[] = [];

  for (const person of data.profiles) {
    const prefs = prefsFor(data, person.id);
    if (!prefs.monthly_summary || !person.email) continue;

    // Already summarised this month for this person? Skip.
    const already = await sentKeys(sb, person.id, "monthly_summary");
    if (already.has(dedupeKey)) continue;

    let candidates: CandidateSnapshot[];
    if (person.role === "candidate") {
      candidates = [
        {
          id: person.id,
          name: person.fullName,
          supervisorName: "",
          state: data.states.get(person.id) ?? null,
        },
      ];
    } else {
      candidates = candidatesFor(data, person);
      // Don't email a supervisor with no candidates.
      if (candidates.length === 0) continue;
    }

    const payload = buildMonthlySummary({
      recipient: toRecipient(person),
      role: person.role,
      candidates,
      appUrl: url,
      now,
    });

    const res = await sendEmail(person.email, payload);
    if (res.ok) {
      if (!res.skipped) {
        sent++;
        await recordSent(sb, person.id, "monthly_summary", [dedupeKey], { at: now.toISOString() });
      }
    } else {
      errors.push(`${person.email}: ${res.error}`);
    }
  }

  return NextResponse.json({ ok: true, month: dedupeKey, sent, errors });
}

export const GET = POST;
