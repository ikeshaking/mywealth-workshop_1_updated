import { describe, it, expect } from "vitest";
import { extractionSchema, extractRequestSchema } from "@/lib/schemas";

describe("extraction schema", () => {
  const valid = {
    title: "Car registration",
    summary: "Renew the car rego.",
    category: "renewal",
    priority: "high",
    due_date: null,
    reminder_date: null,
    follow_up_date: null,
    missing_information: ["due_date"],
    recommended_action: "Confirm the due date.",
    approval_required: true,
    confidence_score: 0.8,
    follow_up_question: "Do you know when it's due?",
    is_decision: false,
    budget: null,
    currency: "GBP",
  };

  it("accepts a well-formed extraction", () => {
    expect(extractionSchema.parse(valid)).toMatchObject({ title: "Car registration" });
  });

  it("rejects an invalid category", () => {
    expect(() => extractionSchema.parse({ ...valid, category: "banana" })).toThrow();
  });

  it("rejects a non-ISO due date (guards against invented free-text dates)", () => {
    expect(() => extractionSchema.parse({ ...valid, due_date: "next tuesday" })).toThrow();
  });

  it("accepts an ISO due date", () => {
    expect(extractionSchema.parse({ ...valid, due_date: "2026-05-23" }).due_date).toBe("2026-05-23");
  });

  it("clamps confidence outside 0..1", () => {
    expect(() => extractionSchema.parse({ ...valid, confidence_score: 1.5 })).toThrow();
  });

  it("defaults optional fields", () => {
    const minimal = {
      title: "Thing",
      summary: "A thing.",
      category: "general",
      priority: "low",
      due_date: null,
      reminder_date: null,
      follow_up_date: null,
      recommended_action: "Do the thing.",
      approval_required: false,
      confidence_score: 0.5,
    };
    const parsed = extractionSchema.parse(minimal);
    expect(parsed.missing_information).toEqual([]);
    expect(parsed.currency).toBe("AUD");
    expect(parsed.is_decision).toBe(false);
  });

  it("validates the extract request body", () => {
    expect(() => extractRequestSchema.parse({ input: "" })).toThrow();
    expect(extractRequestSchema.parse({ input: "hello" }).currency).toBe("AUD");
  });
});
