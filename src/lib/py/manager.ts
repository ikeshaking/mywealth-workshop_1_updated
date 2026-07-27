import type { FocusTarget } from "./actions";
import { deriveTodo } from "./actions";
import { assessCandidate } from "./risk";
import type { ProgramState } from "./types";

/**
 * What the PY manager actually needs to act on.
 *
 * The manager doesn't sign modules off — that's the supervisor's job. Their role
 * is oversight, so this surfaces exceptions and check-ins instead:
 *   • a supervisor letting a candidate's work sit unsigned
 *   • a candidate falling behind the program's requirements
 *   • a candidate moving into a new stage (worth knowing, not fixing)
 *   • the monthly check-in they owe each candidate
 */

/** A supervisor is "slow" once a completed module has waited this long. */
export const STALE_SIGNOFF_DAYS = 7;
/** Stage changes older than this stop being news. */
const PROGRESSION_WINDOW_DAYS = 30;

export type ManagerAlertKind =
  | "supervisor_stalled"
  | "falling_behind"
  | "stage_progressed"
  | "checkin_due";

export type AlertSeverity = "high" | "medium" | "low" | "info";

export interface ManagerAlert {
  kind: ManagerAlertKind;
  severity: AlertSeverity;
  badge: string;
  title: string;
  detail: string;
  candidateId: string;
  candidateName: string;
  supervisorName: string;
  hash?: string;
  focus?: FocusTarget;
}

export interface ManagerInput {
  candidates: {
    id: string;
    name: string;
    supervisorName: string;
    state: ProgramState | null;
  }[];
  /** viewer's per-candidate "last opened" marks, for check-ins. */
  lastViewed?: Record<string, string | undefined>;
  now?: Date;
}

type AuditEntry = { ts?: unknown; cat?: unknown; action?: unknown; detail?: unknown; actor?: unknown };

function auditOf(state: ProgramState | null | undefined): AuditEntry[] {
  if (!state || typeof state !== "object") return [];
  return Array.isArray(state.auditLog) ? (state.auditLog as AuditEntry[]) : [];
}

function daysBetween(fromIso: string, now: Date): number {
  const t = new Date(fromIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

/**
 * When did this module become ready for sign-off? Derived from the candidate's
 * own audit trail (the tracker logs a `module` entry naming the module on
 * completion). Returns null when we can't establish it — we'd rather report
 * nothing than invent a waiting time.
 */
export function moduleReadySince(
  state: ProgramState | null | undefined,
  moduleTitle: string,
): string | null {
  const needle = moduleTitle.toLowerCase();
  let oldest: string | null = null;
  for (const e of auditOf(state)) {
    if (String(e.cat ?? "") !== "module") continue;
    const detail = String(e.detail ?? "").toLowerCase();
    if (!detail.includes(needle)) continue;
    const ts = String(e.ts ?? "");
    if (!ts) continue;
    if (!oldest || ts < oldest) oldest = ts;
  }
  return oldest;
}

/** Build the PY manager's oversight list, most urgent first. */
export function deriveManagerAlerts(input: ManagerInput): ManagerAlert[] {
  const now = input.now ?? new Date();
  const lastViewed = input.lastViewed ?? {};
  const alerts: ManagerAlert[] = [];

  for (const c of input.candidates) {
    const base = {
      candidateId: c.id,
      candidateName: c.name,
      supervisorName: c.supervisorName,
    };

    // --- 1. Supervisor sitting on completed work ---
    const todo = deriveTodo(c.id, c.name, c.supervisorName, c.state);
    if (todo) {
      let worstDays = 0;
      let worstTitle = "";
      let worstModule: string | undefined;
      for (const m of todo.signoffModules) {
        const since = moduleReadySince(c.state, m.title);
        if (!since) continue;
        const days = daysBetween(since, now);
        if (days > worstDays) {
          worstDays = days;
          worstTitle = m.title;
          worstModule = m.id;
        }
      }
      if (worstDays >= STALE_SIGNOFF_DAYS) {
        const others = todo.signoffModules.length - 1;
        alerts.push({
          ...base,
          kind: "supervisor_stalled",
          severity: worstDays >= STALE_SIGNOFF_DAYS * 2 ? "high" : "medium",
          badge: `${worstDays}d waiting`,
          title: `${c.supervisorName} hasn’t signed off ${c.name}`,
          detail:
            `“${worstTitle}” has been waiting ${worstDays} days` +
            (others > 0 ? `, plus ${others} more item${others === 1 ? "" : "s"}.` : "."),
          hash: `#/quarters/${todo.signoffModules[0].quarterId}/training`,
          focus: worstModule ? { moduleId: worstModule } : undefined,
        });
      }
    }

    // --- 2. Falling behind the plan ---
    const risk = assessCandidate(c.id, c.name, c.state, now);
    const behind = risk.flags.filter(
      (f) =>
        f.code === "behind_pace" ||
        f.code === "structured_short" ||
        f.code === "exam_overdue" ||
        f.code === "degree_overdue" ||
        f.code === "inactive",
    );
    for (const f of behind) {
      alerts.push({
        ...base,
        kind: "falling_behind",
        severity: f.severity,
        badge: f.label,
        title: `${c.name} is off track`,
        detail: f.detail,
      });
    }

    // --- 3. Moved into a new stage (informational) ---
    for (const e of auditOf(c.state)) {
      if (String(e.cat ?? "") !== "readiness") continue;
      if (!/quarter progression/i.test(String(e.action ?? ""))) continue;
      const ts = String(e.ts ?? "");
      if (!ts) continue;
      const days = daysBetween(ts, now);
      if (days > PROGRESSION_WINDOW_DAYS) continue;
      alerts.push({
        ...base,
        kind: "stage_progressed",
        severity: "info",
        badge: "Progressed",
        title: `${c.name} moved to a new stage`,
        detail: `${String(e.detail ?? "Quarter progression recorded")} · ${
          days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`
        }`,
      });
      break; // most recent progression only
    }

    // --- 4. Monthly check-in ---
    const seen = lastViewed[c.id];
    const sameMonth =
      !!seen &&
      new Date(seen).getUTCFullYear() === now.getUTCFullYear() &&
      new Date(seen).getUTCMonth() === now.getUTCMonth();
    if (!sameMonth) {
      alerts.push({
        ...base,
        kind: "checkin_due",
        severity: "low",
        badge: "Check-in",
        title: `Monthly check-in with ${c.name}`,
        detail: seen
          ? `You last opened their Professional Year on ${new Date(seen).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
            })}.`
          : "You haven’t opened their Professional Year yet.",
      });
    }
  }

  const order: Record<AlertSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };
  // Exceptions first, gentle reminders last.
  const kindOrder: Record<ManagerAlertKind, number> = {
    supervisor_stalled: 0,
    falling_behind: 1,
    stage_progressed: 2,
    checkin_due: 3,
  };
  alerts.sort(
    (a, b) => order[a.severity] - order[b.severity] || kindOrder[a.kind] - kindOrder[b.kind],
  );
  return alerts;
}

/** Alerts that represent something genuinely wrong (drives the header count). */
export function actionableCount(alerts: ManagerAlert[]): number {
  return alerts.filter((a) => a.kind === "supervisor_stalled" || a.kind === "falling_behind").length;
}
