import { describe, it, expect } from "vitest";
import { buildSeed } from "@/lib/demo/seed";
import * as ops from "@/lib/store/operations";
import type { PlannedReminder } from "@/lib/schemas";

const TODAY = "2026-07-25";

describe("createReminders", () => {
  const reminders: PlannedReminder[] = [
    { title: "Declutter and research removalists", date: "2026-08-01", note: "" },
    { title: "Book removalist", date: "2026-08-29", note: "Confirm the quote first" },
    { title: "Redirect mail", date: null, note: "" },
  ];

  it("creates one tracked item per reminder with its date", () => {
    const data = buildSeed(TODAY);
    const before = data.items.length;
    const { data: next, count } = ops.createReminders(data, reminders, "AUD");

    expect(count).toBe(3);
    expect(next.items.length).toBe(before + 3);

    const booked = next.items.find((i) => i.title === "Book removalist");
    expect(booked).toBeTruthy();
    expect(booked?.due_date).toBe("2026-08-29");
    expect(booked?.reminder_date).toBe("2026-08-29");
  });

  it("counts reminders towards the 'Coming up' metric", () => {
    const data = buildSeed(TODAY);
    const before = ops.computeMetrics(data).upcoming;
    const { data: next } = ops.createReminders(data, reminders, "AUD");
    expect(ops.computeMetrics(next).upcoming).toBeGreaterThan(before);
  });

  it("skips reminders with an empty title", () => {
    const data = buildSeed(TODAY);
    const { count } = ops.createReminders(
      data,
      [{ title: "   ", date: null, note: "" }],
      "AUD",
    );
    expect(count).toBe(0);
  });
});
