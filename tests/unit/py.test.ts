import { describe, expect, it } from "vitest";
import { computeProgress, newBlankState } from "@/lib/py/state";
import { canView } from "@/lib/py/backend";
import type { Profile } from "@/lib/py/types";

function p(id: string, role: Profile["role"], supervisorId: string | null = null): Profile {
  return { id, role, fullName: id, email: id + "@x.test", supervisorId, createdAt: "2026-01-01" };
}

describe("newBlankState", () => {
  it("clones a fresh 51-milestone template and applies overrides", () => {
    const s = newBlankState({ candidateName: "Alex Taylor", supervisorName: "Sarah Nguyen" });
    expect(Object.keys(s.milestones as object)).toHaveLength(51);
    expect((s.profile as Record<string, unknown>).candidateName).toBe("Alex Taylor");
    expect((s.profile as Record<string, unknown>).supervisorName).toBe("Sarah Nguyen");
    // Deep clone — mutating one state must not affect another.
    const s2 = newBlankState();
    (s.profile as Record<string, unknown>).candidateName = "changed";
    expect((s2.profile as Record<string, unknown>).candidateName).toBe("");
  });
});

describe("computeProgress", () => {
  it("returns zeroes for empty/undefined state", () => {
    const r = computeProgress(undefined);
    expect(r.overall).toBe(0);
    expect(r.milestonesTotal).toBe(0);
  });

  it("counts done milestones, sums hours and reflects the exam gate", () => {
    const s = newBlankState();
    const ms = s.milestones as Record<string, { done: boolean }>;
    const keys = Object.keys(ms);
    keys.slice(0, 10).forEach((k) => (ms[k].done = true));
    (s.hours as Record<string, { work: number; structured: number }>).q1 = { work: 400, structured: 30 };
    (s.profile as Record<string, unknown>).examPassed = true;
    (s.profile as Record<string, unknown>).currentQuarter = 2;

    const r = computeProgress(s);
    expect(r.milestonesDone).toBe(10);
    expect(r.milestonesTotal).toBe(51);
    expect(r.workHours).toBe(400);
    expect(r.structuredHours).toBe(30);
    expect(r.examPassed).toBe(true);
    expect(r.currentQuarter).toBe(2);
    expect(r.overall).toBeGreaterThan(0);
    expect(r.overall).toBeLessThanOrEqual(100);
  });
});

describe("canView — role-based access (mirrors RLS)", () => {
  const manager = p("mgr", "py_manager");
  const sup1 = p("s1", "supervisor");
  const sup2 = p("s2", "supervisor");
  const alex = p("alex", "candidate", "s1"); // Sarah's candidate
  const sam = p("sam", "candidate", "s2"); // David's candidate

  it("candidates see only themselves", () => {
    expect(canView(alex, alex)).toBe(true);
    expect(canView(alex, sam)).toBe(false);
    expect(canView(alex, sup1)).toBe(false);
  });

  it("supervisors see their own candidates only", () => {
    expect(canView(sup1, alex)).toBe(true);
    expect(canView(sup1, sam)).toBe(false);
    expect(canView(sup2, sam)).toBe(true);
    expect(canView(sup2, alex)).toBe(false);
  });

  it("the PY manager sees everyone", () => {
    expect(canView(manager, alex)).toBe(true);
    expect(canView(manager, sam)).toBe(true);
    expect(canView(manager, sup1)).toBe(true);
  });
});
