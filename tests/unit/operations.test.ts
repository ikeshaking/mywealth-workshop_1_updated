import { describe, it, expect, beforeEach } from "vitest";
import { buildSeed } from "@/lib/demo/seed";
import { fallbackExtract } from "@/lib/ai/fallback";
import * as ops from "@/lib/store/operations";
import type { MabelData } from "@/lib/types";

const TODAY = "2026-07-25";

function freshData(): MabelData {
  return buildSeed(TODAY);
}

describe("life item creation", () => {
  it("creates an item from an extraction and preserves the original input", () => {
    const data = freshData();
    const input = "I need to sort my car rego soon.";
    const { data: next, item } = ops.createItemFromExtraction(
      data,
      input,
      fallbackExtract(input, TODAY),
    );
    expect(item.original_input).toBe(input);
    expect(item.category).toBe("renewal");
    expect(next.items[0].id).toBe(item.id); // unshifted to front
    expect(next.events.some((e) => e.item_id === item.id && e.type === "created")).toBe(true);
  });

  it("puts a missing-info item into needs_information", () => {
    const data = freshData();
    const input = "I need to book the kids into the dentist.";
    const { item } = ops.createItemFromExtraction(data, input, fallbackExtract(input, TODAY));
    expect(item.status).toBe("needs_information");
  });

  it("creates a decision request + recommendations for a shopping ask", () => {
    const data = freshData();
    const input = "Find me an outdoor dining set under £2,000 that seats six.";
    const { data: next, item, decisionRequestId } = ops.createItemFromExtraction(
      data,
      input,
      fallbackExtract(input, TODAY),
    );
    expect(item.status).toBe("researching");
    expect(decisionRequestId).toBeTruthy();
    const set = next.recommendationSets.find((s) => s.decision_request_id === decisionRequestId);
    expect(set).toBeTruthy();
    const opts = next.recommendationOptions.filter((o) => o.set_id === set!.id);
    expect(opts.length).toBeGreaterThanOrEqual(2);
    expect(opts.some((o) => o.is_best_match)).toBe(true);
  });
});

describe("status transitions", () => {
  it("allows legal transitions and blocks illegal ones", () => {
    expect(ops.canTransition("captured", "needs_attention")).toBe(true);
    expect(ops.canTransition("completed", "in_progress")).toBe(false);
    expect(ops.canTransition("needs_attention", "completed")).toBe(true);
  });

  it("ignores an illegal transition without mutating status", () => {
    const data = freshData();
    const paid = data.items.find((i) => i.id === "item_paidbill")!; // completed
    const next = ops.transitionStatus(data, paid.id, "in_progress");
    expect(next.items.find((i) => i.id === paid.id)!.status).toBe("completed");
  });

  it("sets completed_at when completing", () => {
    const data = freshData();
    const next = ops.transitionStatus(data, "item_rego", "completed");
    const item = next.items.find((i) => i.id === "item_rego")!;
    expect(item.status).toBe("completed");
    expect(item.completed_at).not.toBeNull();
  });
});

describe("reminder generation", () => {
  it("schedules a reminder and records an event", () => {
    const data = freshData();
    const next = ops.scheduleReminder(data, "item_rego", "2026-07-30T08:00:00.000Z", "Check rego");
    const rem = next.reminders.find((r) => r.item_id === "item_rego");
    expect(rem?.message).toBe("Check rego");
    expect(rem?.fired).toBe(false);
  });

  it("fires due reminders and marks them fired", () => {
    const data = freshData();
    // The electricity reminder is scheduled the day after TODAY.
    const { data: next, fired } = ops.fireDueReminders(data, "2027-01-01T00:00:00.000Z");
    expect(fired.length).toBeGreaterThan(0);
    expect(next.reminders.every((r) => r.fired)).toBe(true);
  });

  it("does not fire reminders before their time", () => {
    const data = freshData();
    const { fired } = ops.fireDueReminders(data, "2026-07-25T00:00:00.000Z");
    expect(fired.length).toBe(0);
  });
});

describe("approval lifecycle", () => {
  it("requesting approval moves the item to ready_for_approval", () => {
    const data = freshData();
    const next = ops.requestApproval(data, "item_rego", {
      action: "Prepare renewal",
      reason: "Due soon",
      expected_cost: 789,
      shares: "Vehicle details",
      reversible: true,
    });
    expect(next.items.find((i) => i.id === "item_rego")!.status).toBe("ready_for_approval");
    expect(next.approvals.some((a) => a.item_id === "item_rego" && a.status === "pending")).toBe(true);
  });

  it("approving simulates the action and completes the item", () => {
    const data = freshData();
    const appr = data.approvals.find((a) => a.id === "appr_gym")!;
    const next = ops.resolveApproval(data, appr.id, "approved", {
      money_saved: 359.4,
      summary: "Cancelled",
    });
    const gym = next.items.find((i) => i.id === appr.item_id)!;
    expect(next.approvals.find((a) => a.id === appr.id)!.status).toBe("approved");
    expect(gym.status).toBe("completed");
    expect(gym.money_saved).toBe(359.4);
    expect(next.events.some((e) => e.item_id === gym.id && e.type === "simulated_action")).toBe(true);
  });

  it("rejecting sends the item back to needs_attention", () => {
    const data = freshData();
    const appr = data.approvals.find((a) => a.id === "appr_gym")!;
    const next = ops.resolveApproval(data, appr.id, "rejected");
    expect(next.items.find((i) => i.id === appr.item_id)!.status).toBe("needs_attention");
  });
});

describe("recommendation actions", () => {
  it("saves and rejects an option", () => {
    const data = freshData();
    const opt = data.recommendationOptions[0];
    let next = ops.setOptionFlag(data, opt.id, "saved", true);
    expect(next.recommendationOptions.find((o) => o.id === opt.id)!.saved).toBe(true);
    next = ops.setOptionFlag(next, opt.id, "rejected", true);
    expect(next.recommendationOptions.find((o) => o.id === opt.id)!.rejected).toBe(true);
  });

  it("approving a purchase option creates an approval on the linked item", () => {
    const data = freshData();
    const diningOpt = data.recommendationOptions.find((o) => o.set_id === "recset_dining")!;
    const next = ops.approvePurchaseOption(data, diningOpt.id);
    expect(next.approvals.some((a) => a.item_id === "item_dining")).toBe(true);
    expect(next.items.find((i) => i.id === "item_dining")!.status).toBe("ready_for_approval");
  });
});

describe("metrics", () => {
  it("computes handled / saved figures from completed items", () => {
    const data = freshData();
    const m = ops.computeMetrics(data);
    expect(m.tasksHandled).toBeGreaterThanOrEqual(2);
    expect(m.moneySaved).toBeGreaterThan(0);
    expect(m.decisionsCompleted).toBe(data.decisionRequests.length);
  });
});
