import { describe, expect, it } from "vitest";
import { actionableCount, deriveManagerAlerts, moduleReadySince } from "@/lib/py/manager";
import { newBlankState } from "@/lib/py/state";
import type { ProgramState } from "@/lib/py/types";

const NOW = new Date("2026-08-15T00:00:00.000Z");
const iso = (daysBefore: number) =>
  new Date(NOW.getTime() - daysBefore * 86_400_000).toISOString();

function candidate(opts: {
  pendingModule?: { id: string; title: string; completedDaysAgo: number };
  progressedDaysAgo?: number;
  behind?: boolean;
}): ProgramState {
  const s = newBlankState({ candidateName: "Alex Taylor" });
  const audit: Record<string, unknown>[] = [];

  if (opts.pendingModule) {
    (s.modulesDone as Record<string, { done: boolean }>)[opts.pendingModule.id].done = true;
    audit.push({
      ts: iso(opts.pendingModule.completedDaysAgo),
      actor: "Candidate (Alex Taylor)",
      cat: "module",
      action: "Completed training module",
      detail: `${opts.pendingModule.title} — ready for sign-off`,
    });
  }
  if (opts.progressedDaysAgo !== undefined) {
    audit.push({
      ts: iso(opts.progressedDaysAgo),
      actor: "Candidate (Alex Taylor)",
      cat: "readiness",
      action: "Quarter progression decision",
      detail: "Q3 — Ready to progress",
    });
  }
  if (opts.behind) {
    (s.profile as Record<string, unknown>).startDate = "2026-02-15"; // ~6 months in
    (s.hours as Record<string, { work: number; structured: number }>).q1 = { work: 60, structured: 2 };
  }
  s.auditLog = audit;
  return s;
}

const wrap = (state: ProgramState) => [
  { id: "c1", name: "Alex Taylor", supervisorName: "Sarah Nguyen", state },
];
// A check-in already done this month, so it doesn't pollute other assertions.
const seenThisMonth = { c1: NOW.toISOString() };

describe("moduleReadySince", () => {
  it("finds when a module was completed from the audit trail", () => {
    const s = candidate({
      pendingModule: { id: "q2_super", title: "Superannuation Foundations & Strategies", completedDaysAgo: 10 },
    });
    expect(moduleReadySince(s, "Superannuation Foundations & Strategies")).toBe(iso(10));
  });

  it("returns null when the trail doesn't tell us", () => {
    expect(moduleReadySince(newBlankState(), "Anything")).toBeNull();
  });
});

describe("deriveManagerAlerts", () => {
  it("chases the supervisor once a sign-off has waited long enough", () => {
    const s = candidate({
      pendingModule: { id: "q2_super", title: "Superannuation Foundations & Strategies", completedDaysAgo: 12 },
    });
    const a = deriveManagerAlerts({ candidates: wrap(s), lastViewed: seenThisMonth, now: NOW });
    const stalled = a.find((x) => x.kind === "supervisor_stalled")!;
    expect(stalled).toBeTruthy();
    expect(stalled.title).toMatch(/Sarah Nguyen/);
    expect(stalled.detail).toMatch(/12 days/);
    // Deep-links to the exact module so the manager can see what's waiting.
    expect(stalled.focus?.moduleId).toBe("q2_super");
  });

  it("stays quiet when the supervisor is still within a reasonable window", () => {
    const s = candidate({
      pendingModule: { id: "q2_super", title: "Superannuation Foundations & Strategies", completedDaysAgo: 2 },
    });
    const a = deriveManagerAlerts({ candidates: wrap(s), lastViewed: seenThisMonth, now: NOW });
    expect(a.find((x) => x.kind === "supervisor_stalled")).toBeUndefined();
  });

  it("never asks the manager to sign anything off themselves", () => {
    const s = candidate({
      pendingModule: { id: "q2_super", title: "Superannuation Foundations & Strategies", completedDaysAgo: 12 },
    });
    const a = deriveManagerAlerts({ candidates: wrap(s), lastViewed: seenThisMonth, now: NOW });
    // Sign-off is the supervisor's job; the manager only ever gets oversight kinds.
    for (const alert of a) {
      expect(["supervisor_stalled", "falling_behind", "stage_progressed", "checkin_due"]).toContain(
        alert.kind,
      );
    }
    expect(a.some((x) => /sign off/i.test(x.title))).toBe(false);
  });

  it("flags a candidate falling behind the plan", () => {
    const a = deriveManagerAlerts({
      candidates: wrap(candidate({ behind: true })),
      lastViewed: seenThisMonth,
      now: NOW,
    });
    const behind = a.filter((x) => x.kind === "falling_behind");
    expect(behind.length).toBeGreaterThan(0);
    expect(behind.some((x) => /behind pace/i.test(x.badge))).toBe(true);
  });

  it("reports a recent stage progression but not an old one", () => {
    const recent = deriveManagerAlerts({
      candidates: wrap(candidate({ progressedDaysAgo: 5 })),
      lastViewed: seenThisMonth,
      now: NOW,
    });
    expect(recent.some((x) => x.kind === "stage_progressed")).toBe(true);

    const old = deriveManagerAlerts({
      candidates: wrap(candidate({ progressedDaysAgo: 90 })),
      lastViewed: seenThisMonth,
      now: NOW,
    });
    expect(old.some((x) => x.kind === "stage_progressed")).toBe(false);
  });

  it("raises a monthly check-in only when this month's is outstanding", () => {
    const s = newBlankState();
    const due = deriveManagerAlerts({ candidates: wrap(s), lastViewed: {}, now: NOW });
    expect(due.some((x) => x.kind === "checkin_due")).toBe(true);

    const done = deriveManagerAlerts({ candidates: wrap(s), lastViewed: seenThisMonth, now: NOW });
    expect(done.some((x) => x.kind === "checkin_due")).toBe(false);

    // Last month's visit doesn't count for this month.
    const stale = deriveManagerAlerts({
      candidates: wrap(s),
      lastViewed: { c1: "2026-07-20T00:00:00.000Z" },
      now: NOW,
    });
    expect(stale.some((x) => x.kind === "checkin_due")).toBe(true);
  });

  it("counts only real problems as actionable, not check-ins or progressions", () => {
    const alerts = deriveManagerAlerts({
      candidates: wrap(candidate({ progressedDaysAgo: 3 })),
      lastViewed: {},
      now: NOW,
    });
    // A progression + a check-in are informational — nothing to action.
    expect(actionableCount(alerts)).toBe(0);
  });

  it("orders the most urgent first", () => {
    const s = candidate({
      pendingModule: { id: "q2_super", title: "Superannuation Foundations & Strategies", completedDaysAgo: 20 },
      progressedDaysAgo: 3,
      behind: true,
    });
    const a = deriveManagerAlerts({ candidates: wrap(s), lastViewed: {}, now: NOW });
    // Exceptions first…
    expect(a[0].severity).toBe("high");
    expect(["supervisor_stalled", "falling_behind"]).toContain(a[0].kind);
    // …then the check-in the manager owes, and pure information (a progression) last.
    const kinds = a.map((x) => x.kind);
    expect(kinds.indexOf("checkin_due")).toBeLessThan(kinds.indexOf("stage_progressed"));
    expect(a[a.length - 1].kind).toBe("stage_progressed");
  });
});
