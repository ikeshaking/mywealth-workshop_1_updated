/** The three roles in the MyWealth PY Program. */
export type Role = "candidate" | "supervisor" | "py_manager";

export interface Profile {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  /** For candidates: the supervisor they report to. Null for others. */
  supervisorId: string | null;
  createdAt: string;
}

/**
 * The candidate's entire PY progress record. This is the same opaque object the
 * standalone tracker manages — the shell stores and forwards it without needing
 * to understand its internals.
 */
export type ProgramState = Record<string, unknown>;

export interface ProgramRecord {
  candidateId: string;
  supervisorId: string | null;
  state: ProgramState;
  updatedAt: string;
  updatedBy: string | null;
}

/** A candidate row as seen in supervisor / manager lists, with computed progress. */
export interface CandidateSummary {
  profile: Profile;
  supervisorName: string;
  progress: ProgressSummary;
  updatedAt: string;
}

export interface ProgressSummary {
  /** 0–100 overall completion. */
  overall: number;
  milestonesDone: number;
  milestonesTotal: number;
  currentQuarter: number;
  workHours: number;
  structuredHours: number;
  examPassed: boolean;
}

export interface Session {
  profile: Profile;
}

export const ROLE_LABEL: Record<Role, string> = {
  candidate: "Candidate",
  supervisor: "Supervisor",
  py_manager: "PY Manager",
};
