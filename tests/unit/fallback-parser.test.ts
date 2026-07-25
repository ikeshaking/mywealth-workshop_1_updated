import { describe, it, expect } from "vitest";
import { fallbackExtract } from "@/lib/ai/fallback";
import { extractionSchema } from "@/lib/schemas";

const TODAY = "2026-07-25";

describe("fallback parser", () => {
  it("always returns schema-valid output", () => {
    for (const input of [
      "I need to sort my car rego soon.",
      "buy a sofa",
      "random unclassifiable words",
    ]) {
      expect(() => extractionSchema.parse(fallbackExtract(input, TODAY))).not.toThrow();
    }
  });

  it("classifies a car rego as a renewal needing a due date", () => {
    const e = fallbackExtract("I need to sort my car rego soon.", TODAY);
    expect(e.category).toBe("renewal");
    expect(e.due_date).toBeNull();
    expect(e.missing_information).toContain("due_date");
    expect(e.follow_up_question).toBeTruthy();
  });

  it("extracts a reminder date from 'tomorrow'", () => {
    const e = fallbackExtract("Remind me to pay my electricity bill tomorrow.", TODAY);
    expect(e.category).toBe("bill");
    expect(e.reminder_date).toBe("2026-07-26");
  });

  it("detects a shopping decision with a budget", () => {
    const e = fallbackExtract("Find me an outdoor dining set under £2,000 that seats six.", TODAY);
    expect(e.is_decision).toBe(true);
    expect(e.budget).toBe(2000);
    expect(e.approval_required).toBe(true);
  });

  it("classifies a gym cancellation as a subscription", () => {
    const e = fallbackExtract("I keep paying for a gym membership I do not use.", TODAY);
    expect(e.category).toBe("subscription");
    expect(e.approval_required).toBe(true);
  });

  it("asks who/when for a family dentist booking", () => {
    const e = fallbackExtract("I need to book the kids into the dentist.", TODAY);
    expect(e.category).toBe("family");
    expect(e.follow_up_question).toMatch(/kids|preferred/i);
  });

  it("never invents a precise date it wasn't given", () => {
    const e = fallbackExtract("I should probably organise travel insurance.", TODAY);
    expect(e.due_date).toBeNull();
  });

  it("raises priority for urgent language", () => {
    const e = fallbackExtract("Pay the council rates ASAP", TODAY);
    expect(e.priority).toBe("urgent");
  });
});
