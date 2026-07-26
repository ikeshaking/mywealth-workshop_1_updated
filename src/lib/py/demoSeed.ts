import type { Profile, ProgramRecord, ProgramState } from "./types";
import { newBlankState } from "./state";

/** Demo password accepted for every seeded account (demo mode only). */
export const DEMO_PASSWORD = "mywealth";

export interface DemoDb {
  profiles: Profile[];
  records: Record<string, ProgramRecord>; // keyed by candidateId
}

const CREATED = "2026-02-02T09:00:00.000Z";

function profile(
  id: string,
  role: Profile["role"],
  fullName: string,
  email: string,
  supervisorId: string | null,
): Profile {
  return { id, role, fullName, email, supervisorId, createdAt: CREATED };
}

/** Mark the first `doneCount` milestones done and set some hours, to vary progress. */
function seedState(opts: {
  candidateName: string;
  supervisorName: string;
  currentQuarter: number;
  doneCount: number;
  examPassed?: boolean;
  hours?: Partial<Record<string, { work: number; structured: number }>>;
  /** Module ids the candidate has completed but that still await sign-off. */
  awaitingSignoff?: string[];
  /** Module ids already signed off by the supervisor. */
  signedOff?: string[];
  /** Competency keys (quarter -> keys) the candidate self-rated, awaiting supervisor. */
  selfRated?: { quarter: string; keys: string[] };
  /** Recent candidate activity for the reviewer's feed. */
  activity?: { ts: string; action: string; detail: string; cat: string }[];
}): ProgramState {
  const s = newBlankState({
    candidateName: opts.candidateName,
    supervisorName: opts.supervisorName,
    supervisorFar: "",
    year: "2026",
  });
  const profileObj = s.profile as Record<string, unknown>;
  profileObj.currentQuarter = opts.currentQuarter;
  profileObj.startDate = "2026-02-02";
  profileObj.examPassed = !!opts.examPassed;
  if (opts.examPassed) profileObj.examDate = "2026-05-20";

  const milestones = s.milestones as Record<string, { done: boolean; note: string; proof: string; proofDate: string }>;
  const keys = Object.keys(milestones);
  for (let i = 0; i < Math.min(opts.doneCount, keys.length); i++) {
    milestones[keys[i]].done = true;
    milestones[keys[i]].proofDate = "2026-03-10";
  }

  const hours = s.hours as Record<string, { work: number; structured: number }>;
  if (opts.hours) {
    for (const q of Object.keys(opts.hours)) {
      hours[q] = opts.hours[q]!;
    }
  }

  // Training modules: completed by the candidate, awaiting (or having) sign-off.
  const modulesDone = s.modulesDone as Record<string, { done: boolean; hours: number; notes: string }>;
  const signoffState = s.signoffState as Record<
    string,
    { ticks: Record<string, boolean>; name: string; date: string; signed: boolean; signedBy: string; signedAt: string }
  >;
  for (const id of opts.signedOff ?? []) {
    if (modulesDone[id]) modulesDone[id].done = true;
    if (signoffState[id]) {
      signoffState[id].signed = true;
      signoffState[id].signedBy = opts.supervisorName;
      signoffState[id].signedAt = "2026-03-05T04:00:00.000Z";
    }
  }
  for (const id of opts.awaitingSignoff ?? []) {
    if (modulesDone[id]) modulesDone[id].done = true;
    // signoffState stays signed:false — this is what surfaces in "Needs you".
  }

  // Competencies the candidate has self-rated but the supervisor hasn't.
  if (opts.selfRated) {
    const comp = s.competencyScores as Record<string, Record<string, { candidate: number; supervisor: number }>>;
    const q = comp[opts.selfRated.quarter];
    if (q) {
      for (const k of opts.selfRated.keys) {
        if (q[k]) q[k] = { candidate: 3, supervisor: 0 };
      }
    }
  }

  // Audit log — the reviewer's "recent activity" feed reads candidate entries.
  if (opts.activity) {
    s.auditLog = opts.activity
      .map((a, i) => ({
        id: "seed" + i,
        ts: a.ts,
        actor: "Candidate (" + opts.candidateName + ")",
        cat: a.cat,
        action: a.action,
        detail: a.detail,
        from: "",
        to: "",
      }))
      .sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }

  return s;
}

/** Recent-ish timestamps so the activity feed always looks alive in the demo. */
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

/** Fresh seeded demo database: 1 manager, 2 supervisors, 4 candidates. */
export function buildDemoDb(): DemoDb {
  const mgr = profile("u-mgr", "py_manager", "Priya Anand", "priya@mywealth.demo", null);
  const sup1 = profile("u-sup1", "supervisor", "Sarah Nguyen", "sarah@mywealth.demo", null);
  const sup2 = profile("u-sup2", "supervisor", "David Chen", "david@mywealth.demo", null);

  const c1 = profile("u-alex", "candidate", "Alex Taylor", "alex@mywealth.demo", sup1.id);
  const c2 = profile("u-jordan", "candidate", "Jordan Lee", "jordan@mywealth.demo", sup1.id);
  const c3 = profile("u-sam", "candidate", "Sam Patel", "sam@mywealth.demo", sup2.id);
  const c4 = profile("u-riya", "candidate", "Riya Shah", "riya@mywealth.demo", sup2.id);

  const records: Record<string, ProgramRecord> = {};
  const mk = (
    c: Profile,
    supName: string,
    args: Parameters<typeof seedState>[0],
  ) => {
    records[c.id] = {
      candidateId: c.id,
      supervisorId: c.supervisorId,
      state: seedState({ ...args, supervisorName: supName }),
      updatedAt: "2026-03-11T22:15:00.000Z",
      updatedBy: c.id,
    };
  };

  // Alex — mid-Q2, two modules waiting on Sarah plus competency ratings.
  mk(c1, sup1.fullName, {
    candidateName: c1.fullName,
    supervisorName: sup1.fullName,
    currentQuarter: 2,
    doneCount: 14,
    examPassed: true,
    hours: {
      q1: { work: 480, structured: 42 },
      q2: { work: 220, structured: 20 },
    },
    signedOff: ["q1_journey", "q1_meetings", "q1_systems"],
    awaitingSignoff: ["q2_cashdebt", "q2_super"],
    selfRated: { quarter: "q2", keys: ["0_0", "0_1", "1_0"] },
    activity: [
      { ts: hoursAgo(3), action: "Completed training module", detail: "Cashflow & Debt Foundations — ready for sign-off", cat: "module" },
      { ts: hoursAgo(6), action: "Logged work hours", detail: "Q2 work hours 200 → 220", cat: "hours" },
      { ts: hoursAgo(28), action: "Completed training module", detail: "Superannuation Foundations & Strategies — ready for sign-off", cat: "module" },
      { ts: hoursAgo(30), action: "Self-rated competencies", detail: "Q2 technical competence (3 items)", cat: "competency" },
      { ts: hoursAgo(52), action: "Milestone marked complete", detail: "Q2 · Build a standard SOA under supervision", cat: "milestone" },
    ],
  });

  // Jordan — early Q1, one module waiting.
  mk(c2, sup1.fullName, {
    candidateName: c2.fullName,
    supervisorName: sup1.fullName,
    currentQuarter: 1,
    doneCount: 5,
    hours: { q1: { work: 210, structured: 18 } },
    awaitingSignoff: ["q1_journey"],
    activity: [
      { ts: hoursAgo(11), action: "Completed training module", detail: "Understanding the MyWealth Client Journey — ready for sign-off", cat: "module" },
      { ts: hoursAgo(40), action: "Logged work hours", detail: "Q1 work hours 180 → 210", cat: "hours" },
    ],
  });

  // Sam — Q3, everything signed off (shows an "all clear" candidate).
  mk(c3, sup2.fullName, {
    candidateName: c3.fullName,
    supervisorName: sup2.fullName,
    currentQuarter: 3,
    doneCount: 26,
    examPassed: true,
    hours: {
      q1: { work: 500, structured: 45 },
      q2: { work: 500, structured: 40 },
      q3: { work: 180, structured: 15 },
    },
    signedOff: ["q1_journey", "q1_meetings", "q2_cashdebt", "q2_super", "q2_insurance"],
    activity: [
      { ts: hoursAgo(20), action: "Logged work hours", detail: "Q3 work hours 150 → 180", cat: "hours" },
      { ts: hoursAgo(70), action: "Milestone marked complete", detail: "Q3 · Wealth Creation & Investment Strategy", cat: "milestone" },
    ],
  });

  // Riya — just started, one module waiting.
  mk(c4, sup2.fullName, {
    candidateName: c4.fullName,
    supervisorName: sup2.fullName,
    currentQuarter: 1,
    doneCount: 2,
    hours: { q1: { work: 96, structured: 8 } },
    awaitingSignoff: ["q1_meetings"],
    selfRated: { quarter: "q1", keys: ["0_0"] },
    activity: [
      { ts: hoursAgo(2), action: "Completed training module", detail: "MyWealth Meeting Foundations — ready for sign-off", cat: "module" },
      { ts: hoursAgo(5), action: "Added logbook entry", detail: "First client meeting observation", cat: "general" },
    ],
  });

  return {
    profiles: [mgr, sup1, sup2, c1, c2, c3, c4],
    records,
  };
}
