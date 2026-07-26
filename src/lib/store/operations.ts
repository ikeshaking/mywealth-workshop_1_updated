import type {
  BoData,
  LifeItem,
  Status,
  Approval,
  ApprovalStatus,
  ItemEvent,
  Reminder,
  RecommendationOption,
  DecisionRequest,
  RecommendationSet,
  Memory,
} from "../types";
import type { Extraction, PlannedReminder } from "../schemas";
import { id, nowIso, todayIso, addDays, currencySymbol } from "../utils";
import { recommendFor } from "../ai/recommend";

/**
 * Pure, framework-free operations over the Nook data set. Every function takes
 * the current data and returns a NEW data object (immutably), which makes the
 * whole business layer trivially unit-testable and keeps the React layer thin.
 */

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function pushEvent(
  data: BoData,
  item_id: string,
  type: ItemEvent["type"],
  message: string,
): void {
  data.events.push({
    id: id("evt"),
    item_id,
    type,
    message,
    created_at: nowIso(),
  });
}

/** Legal status transitions. Guards the state machine so tests can assert it. */
const ALLOWED: Record<Status, Status[]> = {
  captured: ["needs_information", "needs_attention", "researching", "scheduled", "dismissed"],
  needs_information: ["needs_attention", "researching", "ready_for_approval", "scheduled", "dismissed"],
  needs_attention: ["needs_information", "researching", "ready_for_approval", "scheduled", "in_progress", "completed", "dismissed"],
  researching: ["ready_for_approval", "needs_information", "dismissed", "scheduled"],
  ready_for_approval: ["in_progress", "scheduled", "completed", "needs_attention", "needs_information", "dismissed"],
  scheduled: ["in_progress", "needs_attention", "completed", "dismissed"],
  in_progress: ["completed", "needs_attention", "dismissed"],
  completed: [],
  dismissed: ["captured", "needs_attention"],
};

export function canTransition(from: Status, to: Status): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Create a life item from an AI extraction result and the original input. */
export function createItemFromExtraction(
  data: BoData,
  input: string,
  extraction: Extraction,
): { data: BoData; item: LifeItem; decisionRequestId: string | null } {
  const next = clone(data);
  const now = nowIso();

  let status: Status;
  if (extraction.is_decision) status = "researching";
  else if (extraction.missing_information.length > 0) status = "needs_information";
  else if (extraction.priority === "urgent" || extraction.priority === "high")
    status = "needs_attention";
  else status = extraction.due_date ? "scheduled" : "captured";

  const inferred = {
    due_date: extraction.due_date !== null && /soon|check/i.test(extraction.summary),
    priority: true,
    category: false,
  };

  let decisionRequestId: string | null = null;
  if (extraction.is_decision) {
    const dr: DecisionRequest = {
      id: id("dr"),
      item_id: null,
      request: input,
      preferences: extraction.budget
        ? [`Under ${currencySymbol(extraction.currency)}${extraction.budget.toLocaleString()}`]
        : [],
      currency: extraction.currency,
      budget: extraction.budget,
      created_at: now,
    };
    next.decisionRequests.push(dr);
    decisionRequestId = dr.id;

    const rec = recommendFor(input, extraction.budget, extraction.currency);
    const set: RecommendationSet = {
      id: id("recset"),
      decision_request_id: dr.id,
      summary: rec.summary,
      created_at: now,
    };
    next.recommendationSets.push(set);
    const options: RecommendationOption[] = rec.options.map((o) => ({ ...o, set_id: set.id }));
    next.recommendationOptions.push(...options);
  }

  const item: LifeItem = {
    id: id("item"),
    user_id: next.user.id,
    title: extraction.title,
    original_input: input,
    summary: extraction.summary,
    category: extraction.category,
    status,
    priority: extraction.priority,
    due_date: extraction.due_date,
    reminder_date: extraction.reminder_date,
    follow_up_date: extraction.follow_up_date,
    source: "chat",
    context: null,
    recommended_action: extraction.recommended_action,
    approval_required: extraction.approval_required,
    confidence_score: extraction.confidence_score,
    inferred,
    money_saved: null,
    time_saved_minutes: null,
    outcome_summary: null,
    decision_request_id: decisionRequestId,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
  next.items.unshift(item);
  if (decisionRequestId) {
    const dr = next.decisionRequests.find((d) => d.id === decisionRequestId);
    if (dr) dr.item_id = item.id;
  }

  pushEvent(next, item.id, "created", `Captured from “${input}”.`);

  // Schedule a reminder if we have a reminder date.
  if (extraction.reminder_date) {
    next.reminders.push({
      id: id("rem"),
      item_id: item.id,
      fire_at: extraction.reminder_date + "T08:00:00.000Z",
      message: `Reminder: ${extraction.title}.`,
      fired: false,
      created_at: now,
    });
    pushEvent(next, item.id, "reminder_scheduled", "Reminder scheduled.");
  }

  return { data: next, item, decisionRequestId };
}

/**
 * Save a set of planned reminders (e.g. from a checklist Nook talked through)
 * as tracked items with dates. Each becomes a scheduled item that shows up under
 * "Coming up" and nudges when due.
 */
export function createReminders(
  data: BoData,
  reminders: PlannedReminder[],
  currency: string,
): { data: BoData; count: number } {
  let next = data;
  let count = 0;
  for (const r of reminders) {
    const title = r.title.trim();
    if (!title) continue;
    const extraction: Extraction = {
      title,
      summary: r.note && r.note.trim().length ? r.note.trim() : title,
      category: "errand",
      priority: "medium",
      due_date: r.date,
      reminder_date: r.date,
      follow_up_date: null,
      missing_information: [],
      recommended_action: "Reminder saved by Nook.",
      approval_required: false,
      confidence_score: 0.9,
      follow_up_question: null,
      is_decision: false,
      budget: null,
      currency,
    };
    next = createItemFromExtraction(next, title, extraction).data;
    count += 1;
  }
  return { data: next, count };
}

export function updateItem(
  data: BoData,
  itemId: string,
  patch: Partial<LifeItem>,
): BoData {
  const next = clone(data);
  const item = next.items.find((i) => i.id === itemId);
  if (!item) return next;
  Object.assign(item, patch, { updated_at: nowIso() });
  return next;
}

export function transitionStatus(
  data: BoData,
  itemId: string,
  to: Status,
  message?: string,
): BoData {
  const next = clone(data);
  const item = next.items.find((i) => i.id === itemId);
  if (!item) return next;
  if (!canTransition(item.status, to)) return next;
  const from = item.status;
  item.status = to;
  item.updated_at = nowIso();
  if (to === "completed") item.completed_at = nowIso();
  pushEvent(
    next,
    itemId,
    to === "completed" ? "completed" : to === "dismissed" ? "dismissed" : "status_changed",
    message ?? `Moved from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`,
  );
  return next;
}

export function addNote(data: BoData, itemId: string, body: string): BoData {
  const next = clone(data);
  next.notes.push({ id: id("note"), item_id: itemId, body, created_at: nowIso() });
  pushEvent(next, itemId, "note_added", "Note added.");
  return next;
}

export function scheduleReminder(
  data: BoData,
  itemId: string,
  fireAtIso: string,
  message: string,
): BoData {
  const next = clone(data);
  next.reminders.push({
    id: id("rem"),
    item_id: itemId,
    fire_at: fireAtIso,
    message,
    fired: false,
    created_at: nowIso(),
  });
  const item = next.items.find((i) => i.id === itemId);
  if (item) {
    item.reminder_date = fireAtIso.slice(0, 10);
    item.updated_at = nowIso();
  }
  pushEvent(next, itemId, "reminder_scheduled", `Reminder set for ${fireAtIso.slice(0, 10)}.`);
  return next;
}

/** Fire any reminders whose time has passed (app-level nudge simulation). */
export function fireDueReminders(data: BoData, atIso = nowIso()): { data: BoData; fired: Reminder[] } {
  const next = clone(data);
  const fired: Reminder[] = [];
  for (const r of next.reminders) {
    if (!r.fired && r.fire_at <= atIso) {
      r.fired = true;
      fired.push(r);
      pushEvent(next, r.item_id, "reminder_fired", r.message);
    }
  }
  return { data: next, fired };
}

/** Create an approval request and move the item to ready_for_approval. */
export function requestApproval(
  data: BoData,
  itemId: string,
  approval: Omit<Approval, "id" | "item_id" | "status" | "created_at" | "resolved_at">,
): BoData {
  let next = clone(data);
  next.approvals.push({
    id: id("appr"),
    item_id: itemId,
    status: "pending",
    created_at: nowIso(),
    resolved_at: null,
    ...approval,
  });
  pushEvent(next, itemId, "approval_requested", `Prepared: ${approval.action}.`);
  next = transitionStatus(next, itemId, "ready_for_approval", "Prepared and ready for your approval.");
  return next;
}

/**
 * Resolve an approval. On approval we simulate the external action, then move
 * the item to in_progress and finally completed with an outcome summary.
 */
export function resolveApproval(
  data: BoData,
  approvalId: string,
  status: ApprovalStatus,
  outcome?: { money_saved?: number; time_saved_minutes?: number; summary?: string },
): BoData {
  let next = clone(data);
  const approval = next.approvals.find((a) => a.id === approvalId);
  if (!approval) return next;
  approval.status = status;
  approval.resolved_at = nowIso();
  const item = next.items.find((i) => i.id === approval.item_id);

  if (status === "approved" && item) {
    pushEvent(next, item.id, "approved", `You approved: ${approval.action}.`);
    pushEvent(next, item.id, "simulated_action", `Simulated: ${approval.action} (no real action taken).`);
    next = transitionStatus(next, item.id, "in_progress", "Nook is handling it (simulated).");
    next = updateItem(next, item.id, {
      money_saved: outcome?.money_saved ?? item.money_saved,
      time_saved_minutes: outcome?.time_saved_minutes ?? 15,
      outcome_summary: outcome?.summary ?? `${approval.action} — handled by Nook (simulated).`,
    });
    next = transitionStatus(next, item.id, "completed", "Done. Quietly handled.");
  } else if (status === "rejected" && item) {
    pushEvent(next, item.id, "rejected", `You declined: ${approval.action}.`);
    next = transitionStatus(next, item.id, "needs_attention", "Left as-is at your request.");
  } else if (status === "snoozed" && item) {
    pushEvent(next, item.id, "snoozed", "Snoozed for 3 days.");
    next = updateItem(next, item.id, { follow_up_date: addDays(todayIso(), 3) });
  }
  return next;
}

/** Mark a simple item complete (e.g. "mark bill paid") with an outcome. */
export function completeItem(
  data: BoData,
  itemId: string,
  outcome?: { money_saved?: number; time_saved_minutes?: number; summary?: string },
): BoData {
  let next = clone(data);
  next = updateItem(next, itemId, {
    money_saved: outcome?.money_saved ?? null,
    time_saved_minutes: outcome?.time_saved_minutes ?? 15,
    outcome_summary: outcome?.summary ?? "Marked complete.",
  });
  next = transitionStatus(next, itemId, "completed", outcome?.summary ?? "Marked complete.");
  return next;
}

// --- Recommendation option actions ----------------------------------------

export function setOptionFlag(
  data: BoData,
  optionId: string,
  flag: "saved" | "rejected",
  value: boolean,
): BoData {
  const next = clone(data);
  const opt = next.recommendationOptions.find((o) => o.id === optionId);
  if (opt) opt[flag] = value;
  return next;
}

/** Approve a purchase: build an approval from the chosen recommendation option. */
export function approvePurchaseOption(
  data: BoData,
  optionId: string,
): BoData {
  let next = clone(data);
  const opt = next.recommendationOptions.find((o) => o.id === optionId);
  if (!opt) return next;
  const set = next.recommendationSets.find((s) => s.id === opt.set_id);
  const dr = next.decisionRequests.find((d) => d.id === set?.decision_request_id);
  const item = next.items.find((i) => i.decision_request_id === dr?.id);
  if (!item) return next;

  next = requestApproval(next, item.id, {
    action: `Prepare purchase of ${opt.title}`,
    reason: opt.why_it_suits,
    expected_cost: opt.total_price,
    shares: "Your delivery address and the order details with the retailer.",
    reversible: true,
  });
  opt.saved = true;
  return next;
}

// --- Memory (what Nook remembers about you) ---------------------------------

export function addMemory(
  data: BoData,
  memory: Pick<Memory, "category" | "label" | "value"> & { source?: string },
): BoData {
  const next = clone(data);
  next.memories.unshift({
    id: id("mem"),
    category: memory.category,
    label: memory.label,
    value: memory.value,
    source: memory.source ?? "You told Nook this.",
    created_at: nowIso(),
  });
  return next;
}

export function updateMemory(data: BoData, memoryId: string, value: string): BoData {
  const next = clone(data);
  const mem = next.memories.find((m) => m.id === memoryId);
  if (mem) mem.value = value;
  return next;
}

export function forgetMemory(data: BoData, memoryId: string): BoData {
  const next = clone(data);
  next.memories = next.memories.filter((m) => m.id !== memoryId);
  return next;
}

// --- Derived metrics -------------------------------------------------------

export function computeMetrics(data: BoData) {
  const completed = data.items.filter((i) => i.status === "completed");
  const decisions = data.decisionRequests.length;
  const upcoming = data.items.filter((i) =>
    ["scheduled", "needs_attention", "needs_information", "ready_for_approval"].includes(i.status),
  ).length;
  const moneySaved = completed.reduce((sum, i) => sum + (i.money_saved ?? 0), 0);
  const timeSaved = completed.reduce((sum, i) => sum + (i.time_saved_minutes ?? 0), 0);
  return {
    tasksHandled: completed.length,
    decisionsCompleted: decisions,
    upcoming,
    moneySaved,
    timeSavedMinutes: timeSaved,
  };
}
