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
  return s;
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
  });
  mk(c2, sup1.fullName, {
    candidateName: c2.fullName,
    supervisorName: sup1.fullName,
    currentQuarter: 1,
    doneCount: 5,
    hours: { q1: { work: 210, structured: 18 } },
  });
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
  });
  mk(c4, sup2.fullName, {
    candidateName: c4.fullName,
    supervisorName: sup2.fullName,
    currentQuarter: 1,
    doneCount: 2,
    hours: { q1: { work: 96, structured: 8 } },
  });

  return {
    profiles: [mgr, sup1, sup2, c1, c2, c3, c4],
    records,
  };
}
