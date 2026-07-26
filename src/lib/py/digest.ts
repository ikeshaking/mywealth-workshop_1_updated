import type { EmailItem, EmailPayload, EmailSection } from "../email/types";
import { deriveActivity, deriveTodo, type Todo } from "./actions";
import { assessCandidate, severityTone, type CandidateRisk } from "./risk";
import { computeProgress } from "./state";
import type { ProgramState } from "./types";

/**
 * Turns candidate records into the emails each role receives:
 *   • daily digest    — what became ready to sign off, plus anything at risk
 *   • monthly summary — last month's progress, highlights and what's outstanding
 *   • candidate nudge — a gentle prompt when someone's own PY has stalled
 *
 * All pure: takes snapshots in, returns payloads out. No I/O, no dates hidden
 * inside — `now` is always injectable so this is deterministic under test.
 */

export interface CandidateSnapshot {
  id: string;
  name: string;
  supervisorName: string;
  state: ProgramState | null;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
}

const firstName = (n: string) => n.split(/\s+/)[0] || n;

/** The calendar month *before* `now`, as an ISO range plus a display label. */
export function previousMonthRange(now: Date): { startIso: string; endIso: string; label: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const label = start.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
  return { startIso: start.toISOString(), endIso: end.toISOString(), label };
}

/** Stable key so the same pending sign-off is never emailed twice. */
export function signoffDedupeKey(candidateId: string, moduleId: string): string {
  return `signoff:${candidateId}:${moduleId}`;
}

export function monthlyDedupeKey(now: Date): string {
  const { startIso } = previousMonthRange(now);
  return `monthly:${startIso.slice(0, 7)}`;
}

function riskItems(risks: CandidateRisk[], includeName: boolean): EmailItem[] {
  const items: EmailItem[] = [];
  for (const r of risks) {
    for (const f of r.flags) {
      items.push({
        badge: f.label,
        tone: severityTone(f.severity),
        title: includeName ? r.candidateName : f.label,
        detail: f.detail,
      });
    }
  }
  return items;
}

/* ============================================================
   DAILY DIGEST — for supervisors and the PY manager
============================================================ */

export interface DailyDigestInput {
  recipient: Recipient;
  candidates: CandidateSnapshot[];
  /** Sign-offs already emailed (dedupe keys), so we only report what's new. */
  alreadySent?: Set<string>;
  appUrl: string;
  now?: Date;
}

export interface DailyDigestResult {
  payload: EmailPayload;
  /** Dedupe keys covered by this email — record these once it's sent. */
  dedupeKeys: string[];
}

/**
 * Returns null when there is genuinely nothing new to say, so we never send an
 * empty "nothing happened" email.
 */
export function buildDailyDigest(input: DailyDigestInput): DailyDigestResult | null {
  const { recipient, candidates, appUrl } = input;
  const now = input.now ?? new Date();
  const alreadySent = input.alreadySent ?? new Set<string>();

  const newSignoffs: EmailItem[] = [];
  const dedupeKeys: string[] = [];
  const competencyItems: EmailItem[] = [];
  const risks: CandidateRisk[] = [];

  for (const c of candidates) {
    const todo: Todo | null = deriveTodo(c.id, c.name, c.supervisorName, c.state);
    if (todo) {
      for (const m of todo.signoffModules) {
        const key = signoffDedupeKey(c.id, m.id);
        if (alreadySent.has(key)) continue;
        dedupeKeys.push(key);
        newSignoffs.push({
          badge: `Q${m.quarterNumber}`,
          tone: "warn",
          title: `${c.name} — ${m.title}`,
          detail: "Completed and waiting for your sign-off.",
        });
      }
      if (todo.competencyPending > 0) {
        competencyItems.push({
          badge: "Rate",
          tone: "info",
          title: c.name,
          detail: `${todo.competencyPending} competenc${
            todo.competencyPending === 1 ? "y" : "ies"
          } self-rated and awaiting your rating.`,
        });
      }
    }

    const risk = assessCandidate(c.id, c.name, c.state, now);
    if (risk.flags.length > 0) risks.push(risk);
  }

  // Nothing newly actionable → don't send.
  if (newSignoffs.length === 0 && risks.length === 0) return null;

  const sections: EmailSection[] = [];
  if (newSignoffs.length > 0) {
    sections.push({
      heading: "Ready for your sign-off",
      blurb: "These were completed since your last digest.",
      items: newSignoffs,
    });
  }
  if (competencyItems.length > 0) {
    sections.push({ heading: "Competencies awaiting your rating", items: competencyItems });
  }
  if (risks.length > 0) {
    sections.push({
      heading: "Needs attention",
      blurb: "Candidates tracking behind the program's requirements.",
      items: riskItems(risks, true),
    });
  }

  const count = newSignoffs.length;
  const subject =
    count > 0
      ? `${count} item${count === 1 ? "" : "s"} ready for your sign-off`
      : `Professional Year — ${risks.length} candidate${risks.length === 1 ? "" : "s"} need attention`;

  return {
    dedupeKeys,
    payload: {
      subject,
      preheader:
        count > 0
          ? `${count} completed module${count === 1 ? "" : "s"} waiting on you.`
          : "A quick check on candidates tracking behind.",
      greeting: `Hi ${firstName(recipient.name)},`,
      intro:
        count > 0
          ? "Here's what your candidates finished and what's waiting on you."
          : "Nothing new to sign off today — but a few candidates are drifting behind.",
      stats: [
        { label: "To sign off", value: String(count) },
        { label: "Needs attention", value: String(risks.length) },
        { label: "Candidates", value: String(candidates.length) },
      ],
      sections,
      ctaLabel: "Open your dashboard",
      ctaHref: appUrl,
      footerNote: "You're receiving this because you supervise Professional Year candidates.",
    },
  };
}

/* ============================================================
   MONTHLY SUMMARY
============================================================ */

export interface MonthlyInput {
  recipient: Recipient;
  role: "candidate" | "supervisor" | "py_manager";
  candidates: CandidateSnapshot[];
  appUrl: string;
  now?: Date;
}

/** Count a candidate's audit activity within the period, grouped by category. */
function monthActivity(c: CandidateSnapshot, startIso: string, endIso: string) {
  const all = deriveActivity(c.id, c.name, c.state).filter((a) => a.ts >= startIso && a.ts < endIso);
  const byCat = new Map<string, number>();
  for (const a of all) byCat.set(a.cat, (byCat.get(a.cat) ?? 0) + 1);
  return { all, byCat, total: all.length };
}

export function buildMonthlySummary(input: MonthlyInput): EmailPayload {
  const { recipient, role, candidates, appUrl } = input;
  const now = input.now ?? new Date();
  const { startIso, endIso, label } = previousMonthRange(now);

  /* ---------- Candidate: their own month ---------- */
  if (role === "candidate") {
    const me = candidates[0];
    const progress = computeProgress(me?.state);
    const act = me ? monthActivity(me, startIso, endIso) : { all: [], byCat: new Map(), total: 0 };
    const highlights: EmailItem[] = act.all.slice(0, 8).map((a) => ({
      badge: a.cat,
      tone: "good",
      title: a.action,
      detail: a.detail,
    }));
    const risk = me ? assessCandidate(me.id, me.name, me.state, now) : null;

    const sections: EmailSection[] = [
      {
        heading: `What you did in ${label}`,
        items: highlights,
        emptyText: "No activity was logged last month.",
      },
    ];
    if (risk && risk.flags.length > 0) {
      sections.push({
        heading: "Worth your attention",
        items: riskItems([risk], false),
      });
    }

    return {
      subject: `Your Professional Year — ${label} summary`,
      preheader: `${act.total} update${act.total === 1 ? "" : "s"} logged, ${progress.overall}% overall.`,
      greeting: `Hi ${firstName(recipient.name)},`,
      intro: `Here's how your Professional Year progressed through ${label}.`,
      stats: [
        { label: "Overall", value: `${progress.overall}%` },
        { label: "Quarter", value: `Q${progress.currentQuarter}` },
        { label: "Work hrs", value: String(progress.workHours) },
        { label: "Structured hrs", value: String(progress.structuredHours) },
      ],
      sections,
      ctaLabel: "Open your Professional Year",
      ctaHref: appUrl,
      footerNote: "Sent at the start of each month. You can turn this off in the app.",
    };
  }

  /* ---------- Supervisor / manager: their candidates' month ---------- */
  const isManager = role === "py_manager";
  const rows: EmailItem[] = [];
  const risks: CandidateRisk[] = [];
  let totalActivity = 0;
  let totalPendingSignoffs = 0;

  for (const c of candidates) {
    const progress = computeProgress(c.state);
    const act = monthActivity(c, startIso, endIso);
    totalActivity += act.total;
    const todo = deriveTodo(c.id, c.name, c.supervisorName, c.state);
    totalPendingSignoffs += todo?.signoffModules.length ?? 0;

    const bits = [`${progress.overall}% overall`, `Q${progress.currentQuarter}`, `${act.total} update${act.total === 1 ? "" : "s"}`];
    if (todo?.signoffModules.length) bits.push(`${todo.signoffModules.length} awaiting sign-off`);

    rows.push({
      badge: act.total > 0 ? "Active" : "Quiet",
      tone: act.total > 0 ? "good" : "info",
      title: isManager ? `${c.name} · ${c.supervisorName}` : c.name,
      detail: bits.join(" · "),
    });

    const risk = assessCandidate(c.id, c.name, c.state, now);
    if (risk.flags.length > 0) risks.push(risk);
  }

  const avg =
    candidates.length > 0
      ? Math.round(
          candidates.reduce((s, c) => s + computeProgress(c.state).overall, 0) / candidates.length,
        )
      : 0;

  const sections: EmailSection[] = [
    {
      heading: isManager ? "Every candidate" : "Your candidates",
      blurb: `Progress through ${label}.`,
      items: rows,
      emptyText: "No candidates assigned yet.",
    },
  ];
  if (risks.length > 0) {
    sections.push({
      heading: "Needs attention",
      blurb: "Tracking behind the program's hour or milestone requirements.",
      items: riskItems(risks, true),
    });
  }
  if (totalPendingSignoffs > 0) {
    sections.push({
      heading: "Outstanding sign-offs",
      items: [
        {
          badge: String(totalPendingSignoffs),
          tone: "warn",
          title: `${totalPendingSignoffs} completed module${totalPendingSignoffs === 1 ? "" : "s"} awaiting sign-off`,
          detail: "Open the dashboard to review and sign these off.",
        },
      ],
    });
  }

  return {
    subject: `Professional Year — ${label} summary`,
    preheader: `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}, ${avg}% average progress.`,
    greeting: `Hi ${firstName(recipient.name)},`,
    intro: isManager
      ? `Here's how the Professional Year program tracked across every supervisor and candidate in ${label}.`
      : `Here's how your candidates tracked through ${label}.`,
    stats: [
      { label: "Candidates", value: String(candidates.length) },
      { label: "Avg. progress", value: `${avg}%` },
      { label: "Updates", value: String(totalActivity) },
      { label: "Needs attention", value: String(risks.length) },
    ],
    sections,
    ctaLabel: "Open your dashboard",
    ctaHref: appUrl,
    footerNote: "Sent at the start of each month. You can turn this off in the app.",
  };
}

/* ============================================================
   CANDIDATE NUDGE
============================================================ */

export interface NudgeInput {
  recipient: Recipient;
  candidate: CandidateSnapshot;
  appUrl: string;
  now?: Date;
}

/** Returns null unless the candidate's own PY has actually stalled. */
export function buildNudge(input: NudgeInput): EmailPayload | null {
  const { recipient, candidate, appUrl } = input;
  const now = input.now ?? new Date();
  const risk = assessCandidate(candidate.id, candidate.name, candidate.state, now);

  // Only nudge on things the candidate themselves can act on.
  const actionable = risk.flags.filter(
    (f) => f.code === "inactive" || f.code === "behind_pace" || f.code === "structured_short" || f.code === "exam_overdue",
  );
  if (actionable.length === 0) return null;

  const progress = computeProgress(candidate.state);
  return {
    subject: "A quick nudge on your Professional Year",
    preheader: actionable[0].detail,
    greeting: `Hi ${firstName(recipient.name)},`,
    intro:
      "Just a friendly check-in on your Professional Year — a couple of things could use your attention.",
    stats: [
      { label: "Overall", value: `${progress.overall}%` },
      { label: "Quarter", value: `Q${progress.currentQuarter}` },
      { label: "Total hrs", value: String(progress.workHours + progress.structuredHours) },
    ],
    sections: [
      {
        heading: "Worth picking up",
        items: actionable.map((f) => ({
          badge: f.label,
          tone: severityTone(f.severity),
          title: f.label,
          detail: f.detail,
        })),
      },
    ],
    ctaLabel: "Open your Professional Year",
    ctaHref: appUrl,
    footerNote: "You can turn these reminders off in the app.",
  };
}
