import type { Category, Status, Priority, PermissionLevel } from "./types";

/**
 * Presentation metadata for the domain enums: human labels, helper copy and
 * Tailwind colour tokens. Keeping this in one place means every screen renders
 * a category or status the same way.
 */

export const categoryMeta: Record<
  Category,
  { label: string; emoji: string; help: string }
> = {
  bill: { label: "Bill", emoji: "🧾", help: "Something to pay" },
  renewal: { label: "Renewal", emoji: "🔄", help: "Renew or re-register" },
  appointment: { label: "Appointment", emoji: "📅", help: "A booking or visit" },
  errand: { label: "Errand", emoji: "🛍️", help: "A small task to run" },
  purchase: { label: "Purchase", emoji: "🛒", help: "Something to buy" },
  decision: { label: "Decision", emoji: "🤔", help: "A choice to make" },
  subscription: { label: "Subscription", emoji: "💳", help: "A recurring plan" },
  household: { label: "Household", emoji: "🏠", help: "Home & maintenance" },
  family: { label: "Family", emoji: "👨‍👩‍👧", help: "Kids & family life" },
  travel: { label: "Travel", emoji: "✈️", help: "Trips & insurance" },
  document: { label: "Document", emoji: "📄", help: "Forms & paperwork" },
  general: { label: "Life admin", emoji: "🗂️", help: "General life admin" },
};

export const statusMeta: Record<
  Status,
  { label: string; tone: "neutral" | "attention" | "progress" | "ready" | "done" }
> = {
  captured: { label: "Captured", tone: "neutral" },
  needs_information: { label: "Needs a detail", tone: "attention" },
  needs_attention: { label: "Needs attention", tone: "attention" },
  researching: { label: "Researching", tone: "progress" },
  ready_for_approval: { label: "Ready for approval", tone: "ready" },
  scheduled: { label: "Scheduled", tone: "progress" },
  in_progress: { label: "In progress", tone: "progress" },
  completed: { label: "Completed", tone: "done" },
  dismissed: { label: "Dismissed", tone: "neutral" },
};

export const priorityMeta: Record<
  Priority,
  { label: string; tone: "low" | "medium" | "high" | "urgent" }
> = {
  low: { label: "Low", tone: "low" },
  medium: { label: "Medium", tone: "medium" },
  high: { label: "High", tone: "high" },
  urgent: { label: "Urgent", tone: "urgent" },
};

export const permissionMeta: Record<
  PermissionLevel,
  { label: string; description: string; comingSoon?: boolean }
> = {
  observe: {
    label: "Observe",
    description: "Bo can identify and organise your information.",
  },
  prepare: {
    label: "Prepare",
    description: "Bo can draft responses, research options and prepare actions.",
  },
  approve: {
    label: "Approve",
    description: "Bo always asks you before taking any external action.",
  },
  autopilot: {
    label: "Autopilot",
    description: "Bo handles routine actions for you automatically.",
    comingSoon: true,
  },
};

/** The dashboard "buckets" and which statuses feed each one. */
export const dashboardSections: {
  key: string;
  title: string;
  subtitle: string;
  statuses: Status[];
}[] = [
  {
    key: "attention",
    title: "Needs your attention",
    subtitle: "A quick look before anything slips.",
    statuses: ["needs_attention", "needs_information"],
  },
  {
    key: "upcoming",
    title: "Coming up",
    subtitle: "On the horizon — nothing to do yet.",
    statuses: ["scheduled", "captured"],
  },
  {
    key: "decisions",
    title: "Decisions in progress",
    subtitle: "Options Bo is weighing up for you.",
    statuses: ["researching"],
  },
  {
    key: "approvals",
    title: "Ready for approval",
    subtitle: "One tap and Bo takes it from here.",
    statuses: ["ready_for_approval"],
  },
  {
    key: "completed",
    title: "Completed for you",
    subtitle: "Quietly handled.",
    statuses: ["completed"],
  },
];
