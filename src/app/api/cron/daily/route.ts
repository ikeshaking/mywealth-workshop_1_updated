import { NextResponse } from "next/server";
import { buildDailyDigest, buildNudge, type CandidateSnapshot } from "@/lib/py/digest";
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
 * Daily job (see vercel.json):
 *   1. Emails each supervisor / PY manager a digest of what became ready to sign
 *      off since their last digest, plus any candidate tracking behind.
 *   2. Nudges candidates whose own Professional Year has stalled — at most once
 *      a week each, enforced by the dedupe key.
 *
 * Duplicate suppression is the notification_log unique index, so re-running this
 * job (or a retried cron) will not re-send anything already sent.
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
  const data = await loadProgramData(sb);

  let digestsSent = 0;
  let nudgesSent = 0;
  const errors: string[] = [];

  // ---- 1. Reviewer digests ----
  const reviewers = data.profiles.filter((p) => p.role === "supervisor" || p.role === "py_manager");
  for (const reviewer of reviewers) {
    const prefs = prefsFor(data, reviewer.id);
    if (!prefs.daily_digest) continue;
    if (!reviewer.email) continue;

    const candidates = candidatesFor(data, reviewer);
    if (candidates.length === 0) continue;

    const alreadySent = await sentKeys(sb, reviewer.id, "daily_digest");
    const built = buildDailyDigest({
      recipient: toRecipient(reviewer),
      candidates,
      alreadySent,
      appUrl: url,
      now,
    });
    if (!built) continue; // nothing new — stay quiet

    const res = await sendEmail(reviewer.email, built.payload);
    if (res.ok) {
      if (!res.skipped) digestsSent++;
      // Record even when skipped-unconfigured would re-send later; only record
      // real sends so a misconfigured run doesn't silently swallow the backlog.
      if (!res.skipped) {
        await recordSent(sb, reviewer.id, "daily_digest", built.dedupeKeys, { at: now.toISOString() });
      }
    } else {
      errors.push(`${reviewer.email}: ${res.error}`);
    }
  }

  // ---- 2. Candidate nudges (max one per week) ----
  const weekKey = `nudge:${isoWeek(now)}`;
  for (const cand of data.profiles.filter((p) => p.role === "candidate")) {
    const prefs = prefsFor(data, cand.id);
    if (!prefs.nudges || !cand.email) continue;

    const already = await sentKeys(sb, cand.id, "nudge");
    if (already.has(weekKey)) continue;

    const snapshot: CandidateSnapshot = {
      id: cand.id,
      name: cand.fullName,
      supervisorName: "",
      state: data.states.get(cand.id) ?? null,
    };
    const payload = buildNudge({ recipient: toRecipient(cand), candidate: snapshot, appUrl: url, now });
    if (!payload) continue;

    const res = await sendEmail(cand.email, payload);
    if (res.ok) {
      if (!res.skipped) {
        nudgesSent++;
        await recordSent(sb, cand.id, "nudge", [weekKey], { at: now.toISOString() });
      }
    } else {
      errors.push(`${cand.email}: ${res.error}`);
    }
  }

  return NextResponse.json({ ok: true, digestsSent, nudgesSent, errors });
}

/** ISO year-week, e.g. "2026-W31" — the granularity of candidate nudges. */
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Vercel Cron issues GET requests; accept both.
export const GET = POST;
