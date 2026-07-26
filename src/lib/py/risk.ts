import { deriveActivity, deriveTodo } from "./actions";
import type { ProgramState } from "./types";

/**
 * Off-pace / at-risk detection for a candidate's Professional Year.
 *
 * The program's own requirements (CONTENT.overview in the tracker):
 *   • 1,600 total hours FTE across 12 months
 *   • minimum 1,500 work-activity hours
 *   • minimum 100 structured-training hours
 *   • ASIC exam passed and degree approved BEFORE Q3
 *
 * Everything here is pure and derived from the candidate's stored record, so it
 * is unit-testable and runs identically on the dashboard and in the cron mailer.
 */

export const TOTAL_HOURS_TARGET = 1600;
export const WORK_HOURS_TARGET = 1500;
export const STRUCTURED_HOURS_TARGET = 100;
export const PROGRAM_MONTHS = 12;

/** How far behind target a candidate may drift before we flag it. */
const PACE_TOLERANCE = 0.85;
/** Pending sign-offs at which the reviewer has a genuine backlog. */
const SIGNOFF_BACKLOG_THRESHOLD = 3;
/** Days of candidate silence before we nudge them. */
const INACTIVITY_DAYS = 14;

export type RiskCode =
  | "behind_pace"
  | "structured_short"
  | "exam_overdue"
  | "degree_overdue"
  | "signoff_backlog"
  | "inactive";

export type Severity = "high" | "medium" | "low";

export interface RiskFlag {
  code: RiskCode;
  severity: Severity;
  /** Short label for a badge, e.g. "Behind pace". */
  label: string;
  /** One-sentence explanation with the actual numbers in it. */
  detail: string;
}

export interface CandidateRisk {
  candidateId: string;
  candidateName: string;
  flags: RiskFlag[];
  /** Highest severity present, or null when the candidate is on track. */
  worst: Severity | null;
}

function monthsBetween(startIso: string, now: Date): number {
  const start = new Date(startIso.length <= 10 ? startIso + "T00:00:00Z" : startIso);
  if (Number.isNaN(start.getTime())) return 0;
  const ms = now.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.44); // average month length
}

function sumHours(state: ProgramState): { work: number; structured: number } {
  const hours = (state.hours ?? {}) as Record<string, { work?: number; structured?: number } | undefined>;
  let work = 0;
  let structured = 0;
  for (const q of Object.keys(hours)) {
    work += Number(hours[q]?.work ?? 0) || 0;
    structured += Number(hours[q]?.structured ?? 0) || 0;
  }
  return { work, structured };
}

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

/** Assess one candidate. Returns flags (possibly empty) and the worst severity. */
export function assessCandidate(
  candidateId: string,
  candidateName: string,
  state: ProgramState | null | undefined,
  now: Date = new Date(),
): CandidateRisk {
  const flags: RiskFlag[] = [];
  if (!state || typeof state !== "object") {
    return { candidateId, candidateName, flags, worst: null };
  }

  const profile = (state.profile ?? {}) as Record<string, unknown>;
  const currentQuarter = Number(profile.currentQuarter ?? 1) || 1;
  const startDate = String(profile.startDate ?? "");
  const { work, structured } = sumHours(state);
  const total = work + structured;

  // --- Pace: are the hours keeping up with elapsed time? ---
  if (startDate) {
    const elapsed = Math.min(monthsBetween(startDate, now), PROGRAM_MONTHS);
    // Only meaningful once they're a month in.
    if (elapsed >= 1) {
      const expectedTotal = (TOTAL_HOURS_TARGET * elapsed) / PROGRAM_MONTHS;
      if (total < expectedTotal * PACE_TOLERANCE) {
        const shortfall = Math.round(expectedTotal - total);
        flags.push({
          code: "behind_pace",
          severity: total < expectedTotal * 0.6 ? "high" : "medium",
          label: "Behind pace",
          detail: `${Math.round(total)} of ~${Math.round(expectedTotal)} hours expected ${Math.round(
            elapsed,
          )} month${Math.round(elapsed) === 1 ? "" : "s"} in — about ${shortfall} hours behind.`,
        });
      }

      const expectedStructured = (STRUCTURED_HOURS_TARGET * elapsed) / PROGRAM_MONTHS;
      if (structured < expectedStructured * PACE_TOLERANCE) {
        flags.push({
          code: "structured_short",
          severity: "medium",
          label: "Structured training low",
          detail: `${Math.round(structured)} of the required ${STRUCTURED_HOURS_TARGET} structured-training hours logged (about ${Math.round(
            expectedStructured,
          )} expected by now).`,
        });
      }
    }
  }

  // --- Hard gates: exam + degree must be done before Q3. ---
  if (currentQuarter >= 3 && !profile.examPassed) {
    flags.push({
      code: "exam_overdue",
      severity: "high",
      label: "Exam outstanding",
      detail: "The ASIC exam must be passed before Q3, and this candidate is already in Q" + currentQuarter + ".",
    });
  }
  if (currentQuarter >= 3 && !profile.degreeVerified) {
    flags.push({
      code: "degree_overdue",
      severity: "high",
      label: "Degree unverified",
      detail: "An approved degree must be verified before Q3, and this candidate is already in Q" + currentQuarter + ".",
    });
  }

  // --- Reviewer backlog: work finished but sitting unsigned. ---
  const todo = deriveTodo(candidateId, candidateName, "", state);
  const pendingSignoffs = todo?.signoffModules.length ?? 0;
  if (pendingSignoffs >= SIGNOFF_BACKLOG_THRESHOLD) {
    flags.push({
      code: "signoff_backlog",
      severity: "medium",
      label: "Sign-off backlog",
      detail: `${pendingSignoffs} completed modules are waiting on a supervisor sign-off.`,
    });
  }

  // --- Silence: nothing logged for a fortnight. ---
  const activity = deriveActivity(candidateId, candidateName, state, { limit: 1 });
  if (activity.length > 0) {
    const lastTs = new Date(activity[0].ts).getTime();
    if (!Number.isNaN(lastTs)) {
      const days = Math.floor((now.getTime() - lastTs) / 86_400_000);
      if (days >= INACTIVITY_DAYS) {
        flags.push({
          code: "inactive",
          severity: days >= INACTIVITY_DAYS * 2 ? "high" : "low",
          label: "No recent activity",
          detail: `Nothing logged for ${days} days.`,
        });
      }
    }
  }

  const worst =
    flags.length === 0
      ? null
      : flags.reduce<Severity>(
          (acc, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[acc] ? f.severity : acc),
          "low",
        );

  return { candidateId, candidateName, flags, worst };
}

/** Tone for a severity, used by dashboard badges and email pills. */
export function severityTone(s: Severity): "danger" | "warn" | "info" {
  return s === "high" ? "danger" : s === "medium" ? "warn" : "info";
}
