import blank from "./blankState.json";
import type { ProgramState, ProgressSummary } from "./types";

/** Deep clone of the pristine blank PY state (same template the tracker seeds). */
export function newBlankState(overrides?: {
  candidateName?: string;
  supervisorName?: string;
  supervisorFar?: string;
  year?: string;
}): ProgramState {
  const s = JSON.parse(JSON.stringify(blank)) as ProgramState;
  const profile = (s.profile ?? {}) as Record<string, unknown>;
  if (overrides?.candidateName !== undefined) profile.candidateName = overrides.candidateName;
  if (overrides?.supervisorName !== undefined) profile.supervisorName = overrides.supervisorName;
  if (overrides?.supervisorFar !== undefined) profile.supervisorFar = overrides.supervisorFar;
  if (overrides?.year !== undefined) profile.year = overrides.year;
  s.profile = profile;
  return s;
}

type MilestoneMap = Record<string, { done?: boolean } | undefined>;
type HoursMap = Record<string, { work?: number; structured?: number } | undefined>;

/** Compute a headline progress summary from an opaque program state. */
export function computeProgress(state: ProgramState | null | undefined): ProgressSummary {
  const empty: ProgressSummary = {
    overall: 0,
    milestonesDone: 0,
    milestonesTotal: 0,
    currentQuarter: 1,
    workHours: 0,
    structuredHours: 0,
    examPassed: false,
  };
  if (!state || typeof state !== "object") return empty;

  const milestones = (state.milestones ?? {}) as MilestoneMap;
  const keys = Object.keys(milestones);
  const total = keys.length;
  const done = keys.filter((k) => milestones[k]?.done).length;

  const hours = (state.hours ?? {}) as HoursMap;
  let workHours = 0;
  let structuredHours = 0;
  for (const q of Object.keys(hours)) {
    workHours += Number(hours[q]?.work ?? 0) || 0;
    structuredHours += Number(hours[q]?.structured ?? 0) || 0;
  }

  const profile = (state.profile ?? {}) as Record<string, unknown>;
  const examPassed = !!profile.examPassed;
  const currentQuarter = Number(profile.currentQuarter ?? 1) || 1;

  // Overall blends milestone completion (primary) with the exam gate.
  const milestonePct = total > 0 ? (done / total) * 100 : 0;
  const overall = Math.round(milestonePct * 0.9 + (examPassed ? 10 : 0));

  return {
    overall: Math.min(100, overall),
    milestonesDone: done,
    milestonesTotal: total,
    currentQuarter,
    workHours,
    structuredHours,
    examPassed,
  };
}
