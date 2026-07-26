import { describe, expect, it } from "vitest";
import { assessCandidate, severityTone } from "@/lib/py/risk";
import {
  buildDailyDigest,
  buildMonthlySummary,
  buildNudge,
  monthlyDedupeKey,
  previousMonthRange,
  signoffDedupeKey,
} from "@/lib/py/digest";
import { newBlankState } from "@/lib/py/state";
import type { ProgramState } from "@/lib/py/types";

const NOW = new Date("2026-08-15T00:00:00.000Z");

function stateWith(mut: (s: ProgramState) => void): ProgramState {
  const s = newBlankState({ candidateName: "Alex Taylor" });
  mut(s);
  return s;
}
const profileOf = (s: ProgramState) => s.profile as Record<string, unknown>;

describe("assessCandidate", () => {
  it("flags nothing for a brand-new record", () => {
    expect(assessCandidate("c1", "Alex", newBlankState(), NOW).flags).toHaveLength(0);
    expect(assessCandidate("c1", "Alex", null, NOW).worst).toBeNull();
  });

  it("flags a candidate whose hours trail the elapsed time", () => {
    // Six months in, only 100 of the ~800 expected hours.
    const s = stateWith((s) => {
      profileOf(s).startDate = "2026-02-15";
      (s.hours as Record<string, { work: number; structured: number }>).q1 = { work: 100, structured: 0 };
    });
    const r = assessCandidate("c1", "Alex", s, NOW);
    const pace = r.flags.find((f) => f.code === "behind_pace")!;
    expect(pace).toBeTruthy();
    expect(pace.severity).toBe("high"); // <60% of expected
    expect(pace.detail).toMatch(/hours behind/);
    expect(r.worst).toBe("high");
  });

  it("does not flag pace for a candidate keeping up", () => {
    const s = stateWith((s) => {
      profileOf(s).startDate = "2026-02-15";
      (s.hours as Record<string, { work: number; structured: number }>).q1 = { work: 780, structured: 55 };
    });
    const codes = assessCandidate("c1", "Alex", s, NOW).flags.map((f) => f.code);
    expect(codes).not.toContain("behind_pace");
    expect(codes).not.toContain("structured_short");
  });

  it("treats a missing exam or degree at Q3 as high severity", () => {
    const s = stateWith((s) => {
      profileOf(s).currentQuarter = 3;
    });
    const codes = assessCandidate("c1", "Alex", s, NOW).flags.map((f) => f.code);
    expect(codes).toContain("exam_overdue");
    expect(codes).toContain("degree_overdue");
  });

  it("clears the exam/degree gates once they are recorded", () => {
    const s = stateWith((s) => {
      const p = profileOf(s);
      p.currentQuarter = 3;
      p.examPassed = true;
      p.degreeVerified = true;
    });
    const codes = assessCandidate("c1", "Alex", s, NOW).flags.map((f) => f.code);
    expect(codes).not.toContain("exam_overdue");
    expect(codes).not.toContain("degree_overdue");
  });

  it("flags a sign-off backlog and a long silence", () => {
    const s = stateWith((s) => {
      const md = s.modulesDone as Record<string, { done: boolean }>;
      ["q1_journey", "q1_meetings", "q1_systems"].forEach((id) => (md[id].done = true));
      s.auditLog = [
        {
          ts: "2026-07-01T00:00:00.000Z", // ~45 days before NOW
          actor: "Candidate (Alex Taylor)",
          action: "Logged hours",
          detail: "",
          cat: "hours",
        },
      ];
    });
    const codes = assessCandidate("c1", "Alex", s, NOW).flags.map((f) => f.code);
    expect(codes).toContain("signoff_backlog");
    expect(codes).toContain("inactive");
  });

  it("maps severity to a display tone", () => {
    expect(severityTone("high")).toBe("danger");
    expect(severityTone("medium")).toBe("warn");
    expect(severityTone("low")).toBe("info");
  });
});

describe("period + dedupe keys", () => {
  it("summarises the previous calendar month", () => {
    const { label, startIso } = previousMonthRange(new Date("2026-08-01T00:30:00.000Z"));
    expect(label).toBe("July 2026");
    expect(startIso.slice(0, 7)).toBe("2026-07");
    expect(monthlyDedupeKey(new Date("2026-08-01T00:30:00.000Z"))).toBe("monthly:2026-07");
  });

  it("builds a stable per-module sign-off key", () => {
    expect(signoffDedupeKey("c1", "q2_super")).toBe("signoff:c1:q2_super");
  });
});

describe("buildDailyDigest", () => {
  const pending = stateWith((s) => {
    (s.modulesDone as Record<string, { done: boolean }>)["q2_super"].done = true;
  });
  const recipient = { id: "s1", name: "Sarah Nguyen", email: "sarah@x.test" };

  it("returns null when there is nothing new to report", () => {
    const res = buildDailyDigest({
      recipient,
      candidates: [{ id: "c1", name: "Alex", supervisorName: "Sarah", state: newBlankState() }],
      appUrl: "https://app.test",
      now: NOW,
    });
    expect(res).toBeNull();
  });

  it("reports a newly pending sign-off with a dedupe key", () => {
    const res = buildDailyDigest({
      recipient,
      candidates: [{ id: "c1", name: "Alex", supervisorName: "Sarah", state: pending }],
      appUrl: "https://app.test",
      now: NOW,
    })!;
    expect(res).not.toBeNull();
    expect(res.dedupeKeys).toContain("signoff:c1:q2_super");
    expect(res.payload.subject).toMatch(/1 item ready/);
    expect(JSON.stringify(res.payload.sections)).toMatch(/Superannuation/);
    expect(res.payload.ctaHref).toBe("https://app.test");
  });

  it("does not re-report a sign-off already emailed", () => {
    const res = buildDailyDigest({
      recipient,
      candidates: [{ id: "c1", name: "Alex", supervisorName: "Sarah", state: pending }],
      alreadySent: new Set(["signoff:c1:q2_super"]),
      appUrl: "https://app.test",
      now: NOW,
    });
    // Nothing new and nothing at risk → stays quiet.
    expect(res).toBeNull();
  });
});

describe("buildMonthlySummary", () => {
  const withJulyActivity = stateWith((s) => {
    profileOf(s).currentQuarter = 2;
    (s.hours as Record<string, { work: number; structured: number }>).q1 = { work: 400, structured: 30 };
    s.auditLog = [
      {
        ts: "2026-07-10T00:00:00.000Z",
        actor: "Candidate (Alex Taylor)",
        action: "Completed training module",
        detail: "Superannuation",
        cat: "module",
      },
      {
        ts: "2026-06-01T00:00:00.000Z", // previous month — must be excluded
        actor: "Candidate (Alex Taylor)",
        action: "Old thing",
        detail: "",
        cat: "hours",
      },
    ];
  });

  it("summarises a candidate's own month and excludes other months", () => {
    const p = buildMonthlySummary({
      recipient: { id: "c1", name: "Alex Taylor", email: "a@x.test" },
      role: "candidate",
      candidates: [{ id: "c1", name: "Alex Taylor", supervisorName: "Sarah", state: withJulyActivity }],
      appUrl: "https://app.test",
      now: NOW,
    });
    expect(p.subject).toMatch(/July 2026/);
    const body = JSON.stringify(p.sections);
    expect(body).toMatch(/Completed training module/);
    expect(body).not.toMatch(/Old thing/);
  });

  it("gives a supervisor a per-candidate roll-up", () => {
    const p = buildMonthlySummary({
      recipient: { id: "s1", name: "Sarah Nguyen", email: "s@x.test" },
      role: "supervisor",
      candidates: [
        { id: "c1", name: "Alex Taylor", supervisorName: "Sarah", state: withJulyActivity },
        { id: "c2", name: "Jordan Lee", supervisorName: "Sarah", state: newBlankState() },
      ],
      appUrl: "https://app.test",
      now: NOW,
    });
    expect(p.sections[0].heading).toBe("Your candidates");
    expect(JSON.stringify(p.sections)).toMatch(/Alex Taylor/);
    expect(p.stats?.find((s) => s.label === "Candidates")?.value).toBe("2");
  });

  it("labels the manager view across supervisors", () => {
    const p = buildMonthlySummary({
      recipient: { id: "m1", name: "Priya Anand", email: "p@x.test" },
      role: "py_manager",
      candidates: [{ id: "c1", name: "Alex Taylor", supervisorName: "Sarah Nguyen", state: withJulyActivity }],
      appUrl: "https://app.test",
      now: NOW,
    });
    expect(p.sections[0].heading).toBe("Every candidate");
    // Manager rows carry the supervising adviser's name.
    expect(JSON.stringify(p.sections)).toMatch(/Sarah Nguyen/);
  });
});

describe("buildNudge", () => {
  it("stays silent for a healthy candidate", () => {
    expect(
      buildNudge({
        recipient: { id: "c1", name: "Alex", email: "a@x.test" },
        candidate: { id: "c1", name: "Alex", supervisorName: "", state: newBlankState() },
        appUrl: "https://app.test",
        now: NOW,
      }),
    ).toBeNull();
  });

  it("nudges only on things the candidate can act on", () => {
    const s = stateWith((s) => {
      profileOf(s).startDate = "2026-02-15";
      (s.hours as Record<string, { work: number; structured: number }>).q1 = { work: 50, structured: 0 };
    });
    const p = buildNudge({
      recipient: { id: "c1", name: "Alex", email: "a@x.test" },
      candidate: { id: "c1", name: "Alex", supervisorName: "", state: s },
      appUrl: "https://app.test",
      now: NOW,
    })!;
    expect(p).not.toBeNull();
    const codes = JSON.stringify(p.sections);
    expect(codes).toMatch(/Behind pace/);
    // A supervisor-only concern must never appear in a candidate nudge.
    expect(codes).not.toMatch(/Sign-off backlog/);
  });
});
