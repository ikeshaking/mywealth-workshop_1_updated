import { describe, expect, it } from "vitest";
import { deriveActivity, deriveTodo, totalPending } from "@/lib/py/actions";
import { newBlankState } from "@/lib/py/state";
import type { ProgramState } from "@/lib/py/types";

function stateWith(mut: (s: ProgramState) => void): ProgramState {
  const s = newBlankState({ candidateName: "Alex Taylor" });
  mut(s);
  return s;
}

describe("deriveTodo", () => {
  it("returns null when nothing is pending", () => {
    expect(deriveTodo("c1", "Alex", "Sarah", newBlankState())).toBeNull();
    expect(deriveTodo("c1", "Alex", "Sarah", null)).toBeNull();
  });

  it("flags modules the candidate finished but nobody signed off", () => {
    const s = stateWith((s) => {
      const md = s.modulesDone as Record<string, { done: boolean }>;
      md["q2_cashdebt"].done = true;
    });
    const todo = deriveTodo("c1", "Alex", "Sarah", s)!;
    expect(todo).not.toBeNull();
    expect(todo.signoffModules).toHaveLength(1);
    // Title + quarter are resolved from the tracker's own content index.
    expect(todo.signoffModules[0].title).toMatch(/Cashflow/i);
    expect(todo.signoffModules[0].quarterNumber).toBe(2);
    // Deep-links into that quarter's training tab.
    expect(todo.hash).toBe("#/quarters/q2/training");
  });

  it("does NOT flag a module that is already signed off", () => {
    const s = stateWith((s) => {
      (s.modulesDone as Record<string, { done: boolean }>)["q2_cashdebt"].done = true;
      (s.signoffState as Record<string, { signed: boolean }>)["q2_cashdebt"].signed = true;
    });
    expect(deriveTodo("c1", "Alex", "Sarah", s)).toBeNull();
  });

  it("counts competencies the candidate rated but the supervisor hasn't", () => {
    const s = stateWith((s) => {
      const comp = s.competencyScores as Record<string, Record<string, { candidate: number; supervisor: number }>>;
      comp.q1["0_0"] = { candidate: 3, supervisor: 0 }; // pending
      comp.q1["0_1"] = { candidate: 3, supervisor: 2 }; // already rated
    });
    const todo = deriveTodo("c1", "Alex", "Sarah", s)!;
    expect(todo.competencyPending).toBe(1);
    expect(todo.hash).toBe("#/competency"); // no modules pending → competency link
    expect(totalPending(todo)).toBe(1);
  });

  it("reports the earliest quarter with competencies awaiting a rating", () => {
    const s = stateWith((s) => {
      const comp = s.competencyScores as Record<string, Record<string, { candidate: number; supervisor: number }>>;
      // Seed a later quarter first — the result must still be the earliest.
      comp.q3["0_0"] = { candidate: 4, supervisor: 0 };
      comp.q2["0_0"] = { candidate: 3, supervisor: 0 };
    });
    const todo = deriveTodo("c1", "Alex", "Sarah", s)!;
    expect(todo.competencyQuarter).toBe("q2");
    expect(todo.competencyPending).toBe(2);
  });

  it("has no competency quarter when nothing is awaiting a rating", () => {
    const s = stateWith((s) => {
      (s.modulesDone as Record<string, { done: boolean }>)["q2_super"].done = true;
    });
    const todo = deriveTodo("c1", "Alex", "Sarah", s)!;
    expect(todo.competencyQuarter).toBeNull();
  });

  it("carries the module id so the shell can open that exact module", () => {
    const s = stateWith((s) => {
      (s.modulesDone as Record<string, { done: boolean }>)["q2_super"].done = true;
    });
    const todo = deriveTodo("c1", "Alex", "Sarah", s)!;
    // The id is what the deep link expands and scrolls to inside the tracker.
    expect(todo.signoffModules[0].id).toBe("q2_super");
    expect(todo.signoffModules[0].quarterId).toBe("q2");
    expect(todo.signoffModules[0].title).toMatch(/Superannuation/);
  });
});

describe("deriveActivity", () => {
  const s = stateWith((s) => {
    s.auditLog = [
      { ts: "2026-03-01T10:00:00.000Z", actor: "Candidate (Alex Taylor)", action: "Logged hours", detail: "Q2", cat: "hours" },
      { ts: "2026-03-03T10:00:00.000Z", actor: "Candidate (Alex Taylor)", action: "Completed module", detail: "Super", cat: "module" },
      { ts: "2026-03-04T10:00:00.000Z", actor: "Supervisor (Sarah)", action: "Signed off", detail: "Super", cat: "module" },
    ];
  });

  it("returns candidate entries newest-first and ignores reviewer actions", () => {
    const acts = deriveActivity("c1", "Alex", s);
    expect(acts).toHaveLength(2); // supervisor entry excluded
    expect(acts[0].action).toBe("Completed module"); // newest first
    expect(acts.every((a) => /^candidate/i.test(a.actor))).toBe(true);
  });

  it("filters to activity since the reviewer last looked", () => {
    const acts = deriveActivity("c1", "Alex", s, { sinceIso: "2026-03-02T00:00:00.000Z" });
    expect(acts).toHaveLength(1);
    expect(acts[0].detail).toBe("Super");
  });

  it("respects a limit", () => {
    expect(deriveActivity("c1", "Alex", s, { limit: 1 })).toHaveLength(1);
  });
});
