/**
 * Core domain types for Nook.
 *
 * These are the single source of truth for the shape of a "life item" and its
 * satellites (notes, events, reminders, approvals, decisions). The Zod schemas
 * in `schemas.ts` are derived from / validated against these ideas, and the
 * Supabase migrations in `/supabase` mirror them column-for-column.
 */

export const CATEGORIES = [
  "bill",
  "renewal",
  "appointment",
  "errand",
  "purchase",
  "decision",
  "subscription",
  "household",
  "family",
  "travel",
  "document",
  "general",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = [
  "captured",
  "needs_information",
  "needs_attention",
  "researching",
  "ready_for_approval",
  "scheduled",
  "in_progress",
  "completed",
  "dismissed",
] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PERMISSION_LEVELS = ["observe", "prepare", "approve", "autopilot"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

/** A single field on a life item that Nook inferred rather than being told. */
export interface InferredMeta {
  due_date?: boolean;
  reminder_date?: boolean;
  priority?: boolean;
  category?: boolean;
}

export interface LifeItem {
  id: string;
  user_id: string;
  title: string;
  original_input: string;
  summary: string;
  category: Category;
  status: Status;
  priority: Priority;
  due_date: string | null; // ISO date
  reminder_date: string | null;
  follow_up_date: string | null;
  source: string; // e.g. "chat", "email", "seed"
  context: string | null; // preserved extra context
  recommended_action: string | null;
  approval_required: boolean;
  confidence_score: number; // 0..1
  /** Which fields were inferred by Nook (shown as "inferred" in the UI). */
  inferred: InferredMeta;
  /** Money/time saved once completed — used for the Completed screen + metrics. */
  money_saved: number | null;
  time_saved_minutes: number | null;
  outcome_summary: string | null;
  decision_request_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type ItemEventType =
  | "created"
  | "status_changed"
  | "reminder_scheduled"
  | "reminder_fired"
  | "note_added"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "snoozed"
  | "completed"
  | "dismissed"
  | "simulated_action";

export interface ItemEvent {
  id: string;
  item_id: string;
  type: ItemEventType;
  message: string;
  created_at: string;
}

export interface ItemNote {
  id: string;
  item_id: string;
  body: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  item_id: string;
  fire_at: string; // ISO datetime
  message: string;
  fired: boolean;
  created_at: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "snoozed";

export interface Approval {
  id: string;
  item_id: string;
  /** What Nook wants to do */
  action: string;
  /** Why it wants to do it */
  reason: string;
  expected_cost: number | null;
  /** What information would be shared to take the action */
  shares: string;
  reversible: boolean;
  status: ApprovalStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface RecommendationItemLine {
  name: string;
  price: number;
  note?: string;
}

export interface RecommendationOption {
  id: string;
  set_id: string;
  title: string;
  is_best_match: boolean;
  total_price: number;
  currency: string;
  items: RecommendationItemLine[];
  advantages: string[];
  trade_offs: string[];
  why_it_suits: string;
  retailer_label: string;
  retailer_url: string;
  delivery: string;
  sizing_notes: string | null;
  saved: boolean;
  rejected: boolean;
}

export interface DecisionRequest {
  id: string;
  item_id: string | null;
  request: string;
  preferences: string[]; // preference chips
  currency: string;
  budget: number | null;
  created_at: string;
}

export interface RecommendationSet {
  id: string;
  decision_request_id: string;
  summary: string;
  created_at: string;
}

export type MessageRole = "user" | "bo";

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  body: string;
  /** If this message resulted in an item, link it for the inline preview card. */
  item_id: string | null;
  decision_request_id: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type HouseholdType = "solo" | "couple" | "family" | "shared";
export type NotificationPreference = "all" | "important" | "quiet";
export type BoTone = "friend" | "calm" | "witty" | "concise";

export interface UserPreferences {
  preferred_name: string;
  household_type: HouseholdType;
  focus_areas: Category[];
  notification_preference: NotificationPreference;
  proactive_suggestions: boolean;
  permission_level: PermissionLevel;
  currency: string;
  /** Nook's selectable voice/personality. */
  tone: BoTone;
  onboarded: boolean;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
}

/** A thing Nook remembers about you — grouped and always editable/forgettable. */
export type MemoryCategory = "about" | "preference" | "date" | "fact";

export interface Memory {
  id: string;
  category: MemoryCategory;
  label: string; // e.g. "Car"
  value: string; // e.g. "Toyota RAV4 · 1ABC23"
  /** Why Nook remembers this — the source, for transparency. */
  source: string;
  created_at: string;
}

/** The full serialisable demo database persisted to localStorage. */
export interface BoData {
  user: DemoUser;
  preferences: UserPreferences;
  items: LifeItem[];
  events: ItemEvent[];
  notes: ItemNote[];
  reminders: Reminder[];
  approvals: Approval[];
  decisionRequests: DecisionRequest[];
  recommendationSets: RecommendationSet[];
  recommendationOptions: RecommendationOption[];
  conversations: Conversation[];
  messages: Message[];
  memories: Memory[];
}
