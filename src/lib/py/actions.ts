import content from "./contentIndex.json";
import type { ProgramState } from "./types";

/** An action the supervisor / manager needs to take on a candidate. */
export interface Todo {
  candidateId: string;
  candidateName: string;
  supervisorName: string;
  /** Modules the candidate has completed that await this reviewer's sign-off. */
  signoffModules: { id: string; title: string; quarterId: string; quarterNumber: number }[];
  /** Competencies the candidate has self-rated but the supervisor hasn't rated. */
  competencyPending: number;
  /** The first quarter (e.g. "q2") with competencies awaiting a rating. */
  competencyQuarter: string | null;
  /** Where to jump inside the candidate's tracker to act. */
  hash: string;
}

/**
 * What to open and scroll to inside the tracker once it loads. The hash alone
 * only gets you to the right tab — this pins the exact module (or competency
 * quarter) the reviewer clicked.
 */
export interface FocusTarget {
  /** A training module id, e.g. "q2_super" — expanded and scrolled into view. */
  moduleId?: string;
  /** A competency quarter, e.g. "q2" — selected on the competency screen. */
  compQuarter?: string;
}

/** A single activity entry from a candidate's audit log. */
export interface Activity {
  candidateId: string;
  candidateName: string;
  ts: string;
  actor: string;
  action: string;
  detail: string;
  cat: string;
}

type ModuleDone = Record<string, { done?: boolean } | undefined>;
type SignoffState = Record<string, { signed?: boolean } | undefined>;
type CompScores = Record<string, Record<string, { candidate?: number; supervisor?: number }> | undefined>;

const MODULE_INDEX = (() => {
  const map = new Map<string, { title: string; quarterId: string; quarterNumber: number }>();
  for (const q of content.quarters) {
    for (const m of q.modules) {
      map.set(m.id, { title: m.title, quarterId: q.id, quarterNumber: q.number });
    }
  }
  return map;
})();

/** Derive the reviewer's to-do for one candidate. Returns null if nothing pending. */
export function deriveTodo(
  candidateId: string,
  candidateName: string,
  supervisorName: string,
  state: ProgramState | null | undefined,
): Todo | null {
  if (!state || typeof state !== "object") return null;

  const modulesDone = (state.modulesDone ?? {}) as ModuleDone;
  const signoff = (state.signoffState ?? {}) as SignoffState;

  const signoffModules: Todo["signoffModules"] = [];
  for (const [id, md] of Object.entries(modulesDone)) {
    if (md?.done && !signoff[id]?.signed) {
      const meta = MODULE_INDEX.get(id);
      signoffModules.push({
        id,
        title: meta?.title ?? id,
        quarterId: meta?.quarterId ?? id.split("_")[0],
        quarterNumber: meta?.quarterNumber ?? 0,
      });
    }
  }
  signoffModules.sort((a, b) => a.quarterNumber - b.quarterNumber);

  // Competencies: candidate has rated (>0) but supervisor hasn't (0/undefined).
  const comp = (state.competencyScores ?? {}) as CompScores;
  let competencyPending = 0;
  let competencyQuarter: string | null = null;
  // Sorted so "the first pending quarter" is the earliest one, not hash order.
  for (const q of Object.keys(comp).sort()) {
    const dom = comp[q];
    if (!dom) continue;
    for (const key of Object.keys(dom)) {
      const s = dom[key];
      if (s && (s.candidate ?? 0) > 0 && (s.supervisor ?? 0) === 0) {
        competencyPending++;
        if (!competencyQuarter) competencyQuarter = q;
      }
    }
  }

  if (signoffModules.length === 0 && competencyPending === 0) return null;

  // Jump to the first pending module's quarter (training tab), else competency.
  const hash =
    signoffModules.length > 0
      ? `#/quarters/${signoffModules[0].quarterId}/training`
      : "#/competency";

  return {
    candidateId,
    candidateName,
    supervisorName,
    signoffModules,
    competencyPending,
    competencyQuarter,
    hash,
  };
}

/** Activity a candidate performed, newest first. Optionally only since `sinceIso`. */
export function deriveActivity(
  candidateId: string,
  candidateName: string,
  state: ProgramState | null | undefined,
  opts?: { sinceIso?: string; limit?: number },
): Activity[] {
  if (!state || typeof state !== "object") return [];
  const log = Array.isArray(state.auditLog) ? (state.auditLog as Record<string, unknown>[]) : [];
  const out: Activity[] = [];
  for (const e of log) {
    const actor = String(e.actor ?? "");
    // We surface what the *candidate* did (not the reviewer's own actions).
    if (!/^candidate/i.test(actor)) continue;
    const ts = String(e.ts ?? "");
    if (opts?.sinceIso && ts <= opts.sinceIso) continue;
    out.push({
      candidateId,
      candidateName,
      ts,
      actor,
      action: String(e.action ?? ""),
      detail: String(e.detail ?? ""),
      cat: String(e.cat ?? "general"),
    });
  }
  out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return opts?.limit ? out.slice(0, opts.limit) : out;
}

export function totalPending(todo: Todo): number {
  return todo.signoffModules.length + todo.competencyPending;
}
