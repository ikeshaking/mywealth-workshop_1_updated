"use client";

import { getBackend } from "./backend";
import { computeProgress } from "./state";
import type { CandidateSummary, Profile } from "./types";

/** Load every candidate the signed-in user may see, with computed progress. */
export async function loadCandidateSummaries(): Promise<{
  candidates: CandidateSummary[];
  supervisors: Profile[];
  all: Profile[];
}> {
  const backend = getBackend();
  const all = await backend.listProfiles();
  const supervisors = all.filter((p) => p.role === "supervisor");
  const supName = (id: string | null) =>
    (id && all.find((p) => p.id === id)?.fullName) || "Unassigned";

  const candProfiles = all.filter((p) => p.role === "candidate");
  const candidates: CandidateSummary[] = [];
  for (const c of candProfiles) {
    let record = null;
    try {
      record = await backend.getRecord(c.id);
    } catch {
      record = null;
    }
    candidates.push({
      profile: c,
      supervisorName: supName(c.supervisorId),
      progress: computeProgress(record?.state),
      updatedAt: record?.updatedAt ?? c.createdAt,
    });
  }
  candidates.sort((a, b) => a.profile.fullName.localeCompare(b.profile.fullName));
  return { candidates, supervisors, all };
}
