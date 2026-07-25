import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ID generator that works in every environment (browser, Node test, edge).
 * Not cryptographically strong — fine for demo records.
 */
export function id(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add days to an ISO date (date-only), returning a new ISO date. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Friendly relative label: "Due tomorrow", "Due in 3 days", "3 days ago". */
export function relativeDay(iso: string | null | undefined, today = todayIso()): string {
  if (!iso) return "No date yet";
  const target = new Date(iso.slice(0, 10) + "T00:00:00").getTime();
  const base = new Date(today + "T00:00:00").getTime();
  const days = Math.round((target - base) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function formatMoney(amount: number | null | undefined, currency = "GBP"): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatMinutes(mins: number | null | undefined): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins} min`;
  const hours = Math.round((mins / 60) * 10) / 10;
  return `${hours} hr${hours === 1 ? "" : "s"}`;
}

export const currencySymbol = (currency: string): string =>
  ({ GBP: "£", USD: "$", EUR: "€", AUD: "A$" })[currency] ?? currency + " ";
