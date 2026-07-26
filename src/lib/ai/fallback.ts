import type { Category, Priority } from "../types";
import type { Extraction } from "../schemas";
import { addDays, currencySymbol } from "../utils";

/**
 * Deterministic, offline natural-language parser.
 *
 * This is what powers Bo in demo mode (no OpenAI key). It is intentionally
 * conservative: it never invents precise dates or costs it wasn't given, marks
 * everything it *does* infer via the caller, and asks a short follow-up when a
 * genuinely required detail is missing. Its output satisfies `extractionSchema`.
 */

interface Rule {
  category: Category;
  keywords: RegExp;
  titleWord: string;
  defaultPriority: Priority;
  approval: boolean;
  action: string;
}

const RULES: Rule[] = [
  {
    category: "renewal",
    keywords: /\b(rego|registration|renew|renewal|licence|license|mot|passport)\b/i,
    titleWord: "Renewal",
    defaultPriority: "high",
    approval: true,
    action: "Confirm the due date, then prepare the renewal.",
  },
  {
    category: "bill",
    keywords: /\b(bill|invoice|pay(ment)?|electricity|water|gas|energy|council rates|rates)\b/i,
    titleWord: "Bill",
    defaultPriority: "high",
    approval: false,
    action: "Set a reminder and prepare the payment.",
  },
  {
    category: "subscription",
    keywords: /\b(subscription|membership|gym|netflix|spotify|cancel|renews?|direct debit)\b/i,
    titleWord: "Subscription",
    defaultPriority: "medium",
    approval: true,
    action: "Review usage, then prepare a cancellation for approval.",
  },
  {
    // Family comes before the generic appointment rule: "book the kids into the
    // dentist" is family life admin, not just any appointment.
    category: "family",
    keywords: /\b(kids?|children|child|school|nursery|babysitter|family)\b/i,
    titleWord: "Family",
    defaultPriority: "medium",
    approval: true,
    action: "Gather details, then propose options.",
  },
  {
    category: "appointment",
    keywords: /\b(appointment|book(ing)?|dentist|doctor|gp|haircut|schedule|visit)\b/i,
    titleWord: "Appointment",
    defaultPriority: "medium",
    approval: true,
    action: "Gather preferences, then propose booking options.",
  },
  {
    category: "travel",
    keywords: /\b(travel|flight|holiday|trip|insurance|hotel|visa|passport)\b/i,
    titleWord: "Travel",
    defaultPriority: "medium",
    approval: true,
    action: "Research suitable options.",
  },
  {
    category: "document",
    keywords: /\b(form|document|permission slip|permission form|paperwork|contract|sign)\b/i,
    titleWord: "Document",
    defaultPriority: "medium",
    approval: false,
    action: "Capture the details and set a reminder.",
  },
  {
    category: "household",
    keywords: /\b(washing machine|fridge|repair|replace|plumber|electrician|garden|clean|maintenance|wardrobe|furniture)\b/i,
    titleWord: "Household",
    defaultPriority: "medium",
    approval: true,
    action: "Research options and prepare a recommendation.",
  },
  {
    category: "purchase",
    keywords: /\b(buy|find me|purchase|shop|order|dining set|sofa|tv|laptop|gift|present)\b/i,
    titleWord: "Purchase",
    defaultPriority: "medium",
    approval: true,
    action: "Research complete options within budget.",
  },
];

const DECISION_HINT =
  /\b(find|recommend|which|best|compare|help me choose|should i|options?|under £?\$?\d|repair or replace)\b/i;

const URGENT_HINT = /\b(urgent|asap|today|now|overdue|immediately)\b/i;
const SOON_HINT = /\b(soon|this week|shortly)\b/i;

/** Parse an explicit budget like "under $2,000", "less than $1000", "under 80". */
function parseBudget(input: string): { budget: number | null; currency: string } {
  const currencyMatch = input.match(/([£$€])/);
  // Default to AUD; "$" means AUD in an Australian context.
  const currency =
    currencyMatch?.[1] === "£"
      ? "GBP"
      : currencyMatch?.[1] === "€"
        ? "EUR"
        : "AUD";
  const m = input.match(/(?:under|less than|below|max(?:imum)?|budget of|around)\s*[£$€]?\s*([\d,]+)/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    return { budget: Number.isFinite(n) ? n : null, currency };
  }
  const bare = input.match(/[£$€]\s*([\d,]+)/);
  if (bare) {
    const n = Number(bare[1].replace(/,/g, ""));
    return { budget: Number.isFinite(n) ? n : null, currency };
  }
  return { budget: null, currency };
}

/** Resolve simple relative dates. Only returns a date when the text is explicit. */
function parseDate(input: string, today: string): string | null {
  if (/\btomorrow\b/i.test(input)) return addDays(today, 1);
  if (/\btoday\b/i.test(input)) return today;
  if (/\bnext week\b/i.test(input)) return addDays(today, 7);
  const inDays = input.match(/\bin (\d+) days?\b/i);
  if (inDays) return addDays(today, Number(inDays[1]));
  // Explicit numeric date like 23 May 2025 / 23/05/2025
  const dmy = input.match(/\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? "20" + y : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fallbackExtract(input: string, today: string): Extraction {
  const text = input.trim();
  const rule = RULES.find((r) => r.keywords.test(text)) ?? {
    category: "general" as Category,
    titleWord: "Life admin",
    defaultPriority: "medium" as Priority,
    approval: false,
    action: "Capture this and suggest a next step.",
  };

  const { budget, currency } = parseBudget(text);
  const isDecision = DECISION_HINT.test(text) || rule.category === "purchase" || rule.category === "decision";

  const explicitDate = parseDate(text, today);
  let due_date: string | null = explicitDate;
  let reminder_date: string | null = null;

  // "Remind me ..." → the parsed date is a reminder, not necessarily a due date.
  const isReminder = /\bremind( me)?\b/i.test(text);
  if (isReminder && explicitDate) {
    reminder_date = explicitDate;
    due_date = explicitDate;
  }

  let priority: Priority = rule.defaultPriority;
  if (URGENT_HINT.test(text)) priority = "urgent";
  else if (SOON_HINT.test(text) && priority === "medium") priority = "high";

  // Build a short human title from the input.
  const cleaned = text.replace(/[.?!]+$/g, "");
  const shortTitle =
    cleaned.length <= 60 ? titleCase(cleaned) : titleCase(cleaned.slice(0, 57)) + "…";

  const missing: string[] = [];
  let follow_up_question: string | null = null;

  if (
    !due_date &&
    ["renewal", "bill", "appointment"].includes(rule.category) &&
    !isDecision
  ) {
    missing.push("due_date");
    follow_up_question =
      rule.category === "appointment"
        ? "Do you have a preferred date, or should I suggest some times?"
        : "Do you know when this is due, or should I remind you to check?";
  }

  if (rule.category === "family" && /dentist|doctor|appointment|book/i.test(text)) {
    missing.push("who and preferred timing");
    follow_up_question = "Which of the kids is this for, and any preferred days or times?";
  }

  if (isDecision && !budget && /\b(find|buy|recommend|best)\b/i.test(text)) {
    missing.push("budget");
    if (!follow_up_question) follow_up_question = "Do you have a budget in mind?";
  }

  // Follow-up scheduling for things marked "soon" without a date.
  const follow_up_date =
    !due_date && (SOON_HINT.test(text) || missing.includes("due_date"))
      ? addDays(today, 3)
      : null;

  const summary = isDecision
    ? `You'd like Bo to research options${budget ? ` under ${currencySymbol(currency)}${budget.toLocaleString()}` : ""} and recommend the best fit.`
    : `Bo understood this as a ${rule.category} to keep on top of.`;

  // Confidence: high when a rule matched cleanly and few details are missing.
  const matchedRule = rule.category !== "general";
  const confidence = Math.max(
    0.4,
    Math.min(0.95, (matchedRule ? 0.8 : 0.5) - missing.length * 0.1),
  );

  return {
    title: shortTitle,
    summary,
    category: rule.category,
    priority,
    due_date,
    reminder_date,
    follow_up_date,
    missing_information: missing,
    recommended_action: rule.action,
    approval_required: rule.approval || isDecision,
    confidence_score: Math.round(confidence * 100) / 100,
    follow_up_question,
    is_decision: isDecision,
    budget,
    currency,
  };
}
