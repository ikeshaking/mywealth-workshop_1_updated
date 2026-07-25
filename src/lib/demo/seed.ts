import type {
  MabelData,
  LifeItem,
  Approval,
  Reminder,
  ItemEvent,
  DecisionRequest,
  RecommendationSet,
  RecommendationOption,
  Conversation,
  Message,
} from "../types";
import { recommendFor } from "../ai/recommend";

/**
 * Realistic seed data for demo mode. Dates are computed relative to "today" so
 * the demo always feels current (bill due tomorrow, rego due next week, etc.).
 *
 * Covers the scenarios in the brief: car registration, electricity bill,
 * internet plan, gym subscription, dentist appointment, outdoor dining set,
 * council rates, travel insurance, and a school permission form.
 */

const USER_ID = "demo-user";

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildSeed(today: string): MabelData {
  const nowIso = today + "T09:00:00.000Z";
  const items: LifeItem[] = [];
  const events: ItemEvent[] = [];
  const reminders: Reminder[] = [];
  const approvals: Approval[] = [];

  let evtSeq = 0;
  const addEvent = (item_id: string, type: ItemEvent["type"], message: string, dayOffset = 0) => {
    events.push({
      id: `evt_seed_${evtSeq++}`,
      item_id,
      type,
      message,
      created_at: addDays(today, dayOffset) + "T09:00:00.000Z",
    });
  };

  const base = (partial: Partial<LifeItem> & Pick<LifeItem, "id" | "title" | "category" | "status">): LifeItem => ({
    user_id: USER_ID,
    original_input: partial.original_input ?? partial.title,
    summary: partial.summary ?? "",
    priority: "medium",
    due_date: null,
    reminder_date: null,
    follow_up_date: null,
    source: "seed",
    context: null,
    recommended_action: null,
    approval_required: false,
    confidence_score: 0.9,
    inferred: {},
    money_saved: null,
    time_saved_minutes: null,
    outcome_summary: null,
    decision_request_id: null,
    created_at: nowIso,
    updated_at: nowIso,
    completed_at: null,
    ...partial,
  });

  // 1. Car registration — needs attention, due date inferred/unknown → known
  const rego = base({
    id: "item_rego",
    title: "Car registration",
    original_input: "I need to sort my car rego soon.",
    summary: "Renew your Toyota RAV4 registration before it lapses.",
    category: "renewal",
    status: "needs_attention",
    priority: "high",
    due_date: addDays(today, 12),
    follow_up_date: addDays(today, 3),
    context: "Vehicle: Toyota RAV4 · Plate 1ABC23 · Source: Service NSW",
    recommended_action: "Confirm the amount and prepare the renewal for approval.",
    approval_required: true,
    confidence_score: 0.82,
    inferred: { due_date: true, priority: true },
  });
  items.push(rego);
  addEvent(rego.id, "created", "Captured from “I need to sort my car rego soon.”", -2);
  addEvent(rego.id, "status_changed", "Marked as needs attention.", -2);

  // 2. Electricity bill — coming up, due tomorrow
  const elec = base({
    id: "item_elec",
    title: "Electricity bill",
    original_input: "Electricity bill $89.99 due tomorrow",
    summary: "Your electricity bill is due tomorrow.",
    category: "bill",
    status: "scheduled",
    priority: "high",
    due_date: addDays(today, 1),
    reminder_date: addDays(today, 1),
    context: "$89.99 with Sparked Energy",
    recommended_action: "Pay before the due date to avoid a late fee.",
    confidence_score: 0.95,
  });
  items.push(elec);
  addEvent(elec.id, "created", "Captured your electricity bill.", -1);
  reminders.push({
    id: "rem_elec",
    item_id: elec.id,
    fire_at: addDays(today, 1) + "T08:00:00.000Z",
    message: "Your electricity bill ($89.99) is due today.",
    fired: false,
    created_at: nowIso,
  });
  addEvent(elec.id, "reminder_scheduled", "Reminder set for the due date.", -1);

  // 3. Internet plan — decision in progress (seems expensive)
  const internetDecision: DecisionRequest = {
    id: "dr_internet",
    item_id: "item_internet",
    request: "My internet bill seems expensive — help me choose a better plan.",
    preferences: ["Lower cost", "Fast enough for streaming", "No downtime"],
    currency: "AUD",
    budget: null,
    created_at: nowIso,
  };
  const internetRec = recommendFor(internetDecision.request, null, "AUD");
  const internetSet: RecommendationSet = {
    id: "recset_internet",
    decision_request_id: internetDecision.id,
    summary: internetRec.summary,
    created_at: nowIso,
  };
  const internetOptions = internetRec.options.map((o) => ({ ...o, set_id: internetSet.id }));
  const internet = base({
    id: "item_internet",
    title: "Review internet plan",
    original_input: "My internet bill seems expensive.",
    summary: "Mabel found a faster plan that saves an estimated $216/year.",
    category: "subscription",
    status: "researching",
    priority: "medium",
    context: "Currently $50/mo with your provider",
    recommended_action: "Review the recommended switch and approve when ready.",
    approval_required: true,
    confidence_score: 0.78,
    decision_request_id: internetDecision.id,
  });
  items.push(internet);
  addEvent(internet.id, "created", "Captured that your internet bill seems expensive.", -4);
  addEvent(internet.id, "status_changed", "Researching cheaper plans.", -4);

  // 4. Gym subscription — cancellation, ready for approval
  const gym = base({
    id: "item_gym",
    title: "Cancel gym membership",
    original_input: "I keep paying for a gym membership I do not use.",
    summary: "You haven't used this in 45 days. Mabel prepared a cancellation.",
    category: "subscription",
    status: "ready_for_approval",
    priority: "medium",
    context: "$29.95/month · renews in 4 days",
    reminder_date: addDays(today, 4),
    recommended_action: "Approve the cancellation before it renews in 4 days.",
    approval_required: true,
    confidence_score: 0.88,
    inferred: { reminder_date: true },
  });
  items.push(gym);
  addEvent(gym.id, "created", "Captured your gym cancellation.", -3);
  addEvent(gym.id, "approval_requested", "Prepared a cancellation for your approval.", -1);
  approvals.push({
    id: "appr_gym",
    item_id: gym.id,
    action: "Cancel your gym membership",
    reason: "You haven't checked in for 45 days and it renews in 4 days at $29.95.",
    expected_cost: 0,
    shares: "Your membership ID and name with the gym's cancellation form.",
    reversible: true,
    status: "pending",
    created_at: nowIso,
    resolved_at: null,
  });
  reminders.push({
    id: "rem_gym",
    item_id: gym.id,
    fire_at: addDays(today, 3) + "T09:00:00.000Z",
    message: "The gym membership you wanted to cancel renews tomorrow.",
    fired: false,
    created_at: nowIso,
  });

  // 5. Dentist appointment (family) — needs information
  const dentist = base({
    id: "item_dentist",
    title: "Book the kids' dentist",
    original_input: "I need to book the kids into the dentist.",
    summary: "Mabel needs to know who and when before proposing times.",
    category: "family",
    status: "needs_information",
    priority: "medium",
    recommended_action: "Tell Mabel which children and preferred timing.",
    approval_required: true,
    confidence_score: 0.7,
    follow_up_date: addDays(today, 2),
  });
  items.push(dentist);
  addEvent(dentist.id, "created", "Captured the dentist booking.", -1);
  addEvent(dentist.id, "status_changed", "Needs a couple of details.", -1);

  // 6. Outdoor dining set — decision in progress with full recommendations
  const diningDecision: DecisionRequest = {
    id: "dr_dining",
    item_id: "item_dining",
    request: "Find me an outdoor dining set under $2,000 that seats six.",
    preferences: ["Under $2,000", "Seats 6", "Weather resistant", "Modern"],
    currency: "AUD",
    budget: 2000,
    created_at: nowIso,
  };
  const diningRec = recommendFor(diningDecision.request, 2000, "AUD");
  const diningSet: RecommendationSet = {
    id: "recset_dining",
    decision_request_id: diningDecision.id,
    summary: diningRec.summary,
    created_at: nowIso,
  };
  const diningOptions = diningRec.options.map((o) => ({ ...o, set_id: diningSet.id }));
  const dining = base({
    id: "item_dining",
    title: "Outdoor dining set",
    original_input: "Find me an outdoor dining set under $2,000 that seats six.",
    summary: "3 complete solutions found. Best match: Haven 7-Piece at $1,699.",
    category: "purchase",
    status: "researching",
    priority: "low",
    context: "Budget $2,000 · seats 6 · weather resistant",
    recommended_action: "Compare the options and approve your favourite.",
    approval_required: true,
    confidence_score: 0.9,
    decision_request_id: diningDecision.id,
  });
  items.push(dining);
  addEvent(dining.id, "created", "Captured your outdoor dining request.", -2);
  addEvent(dining.id, "status_changed", "Found 3 complete options.", -2);

  // 7. Council rates — coming up
  const rates = base({
    id: "item_rates",
    title: "Council rates",
    original_input: "Council rates due 25th",
    summary: "Quarterly council rates payment.",
    category: "bill",
    status: "scheduled",
    priority: "medium",
    due_date: addDays(today, 9),
    context: "$1,234.00 · quarterly",
    recommended_action: "Set aside funds; Mabel will remind you.",
    confidence_score: 0.92,
  });
  items.push(rates);
  addEvent(rates.id, "created", "Captured your council rates.", -5);

  // 8. Travel insurance — captured / general nudge
  const travel = base({
    id: "item_travel",
    title: "Organise travel insurance",
    original_input: "I should probably organise travel insurance.",
    summary: "You mentioned travel insurance. Want Mabel to find options?",
    category: "travel",
    status: "captured",
    priority: "low",
    follow_up_date: addDays(today, 5),
    recommended_action: "Share your trip dates and Mabel will compare policies.",
    confidence_score: 0.6,
    inferred: { priority: true },
  });
  items.push(travel);
  addEvent(travel.id, "created", "Captured travel insurance.", -6);

  // 9. School permission form — document
  const permission = base({
    id: "item_permission",
    title: "School permission form",
    original_input: "Sign and return the school trip permission form",
    summary: "Sign and return before the deadline.",
    category: "document",
    status: "needs_attention",
    priority: "high",
    due_date: addDays(today, 2),
    context: "Year 3 museum trip",
    recommended_action: "Sign the form; Mabel can remind you to hand it in.",
    confidence_score: 0.85,
  });
  items.push(permission);
  addEvent(permission.id, "created", "Captured the permission form.", -1);

  // 10. Completed example — electricity bill paid previously
  const paidBill = base({
    id: "item_paidbill",
    title: "Water bill paid",
    original_input: "Pay the water bill",
    summary: "Your water bill was paid on time.",
    category: "bill",
    status: "completed",
    priority: "medium",
    context: "$120.00 · Sydney Water",
    outcome_summary: "Paid $120.00 to Sydney Water — 2 days early.",
    time_saved_minutes: 15,
    money_saved: 0,
    completed_at: addDays(today, -3) + "T10:00:00.000Z",
    confidence_score: 0.95,
  });
  items.push(paidBill);
  addEvent(paidBill.id, "completed", "Marked as paid.", -3);

  // 11. Completed example — a subscription cancelled, money saved
  const cancelledStream = base({
    id: "item_cancelled_stream",
    title: "Cancelled unused streaming plan",
    original_input: "Cancel the streaming service nobody watches",
    summary: "Mabel cancelled a streaming plan you weren't using.",
    category: "subscription",
    status: "completed",
    priority: "low",
    outcome_summary: "Cancelled StreamPlus — saving $143.88 a year.",
    money_saved: 143.88,
    time_saved_minutes: 20,
    completed_at: addDays(today, -7) + "T14:00:00.000Z",
    confidence_score: 0.9,
  });
  items.push(cancelledStream);
  addEvent(cancelledStream.id, "completed", "Cancellation confirmed (simulated).", -7);

  const conversation: Conversation = {
    id: "conv_main",
    user_id: USER_ID,
    title: "Chat with Mabel",
    created_at: nowIso,
    updated_at: nowIso,
  };

  const messages: Message[] = [
    {
      id: "msg_1",
      conversation_id: conversation.id,
      role: "mabel",
      body: "Morning! I'm keeping an eye on a few things for you. Tell me anything and I'll handle the admin.",
      item_id: null,
      decision_request_id: null,
      created_at: nowIso,
    },
  ];

  const decisionRequests: DecisionRequest[] = [internetDecision, diningDecision];
  const recommendationSets: RecommendationSet[] = [internetSet, diningSet];
  const recommendationOptions: RecommendationOption[] = [...internetOptions, ...diningOptions];

  return {
    user: { id: USER_ID, email: "alex@example.com", name: "Alex" },
    preferences: {
      preferred_name: "Alex",
      household_type: "family",
      focus_areas: ["bill", "renewal", "subscription", "family"],
      notification_preference: "important",
      proactive_suggestions: true,
      permission_level: "approve",
      currency: "AUD",
      onboarded: true,
    },
    items,
    events,
    notes: [],
    reminders,
    approvals,
    decisionRequests,
    recommendationSets,
    recommendationOptions,
    conversations: [conversation],
    messages,
  };
}
