/**
 * A rendered-email contract. The digest/risk logic produces these payloads and
 * the renderer turns them into branded HTML — so the "what to say" logic stays
 * pure and testable, and the "how it looks" lives in one place.
 */

export type Tone = "info" | "warn" | "danger" | "good";

export interface EmailItem {
  title: string;
  detail?: string;
  /** Small pill on the left, e.g. "Sign off", "Q2", "Behind pace". */
  badge?: string;
  tone?: Tone;
}

export interface EmailSection {
  heading: string;
  /** Optional one-line explanation under the heading. */
  blurb?: string;
  items: EmailItem[];
  /** Shown instead of items when the list is empty (optional). */
  emptyText?: string;
}

export interface EmailStat {
  label: string;
  value: string;
}

export interface EmailPayload {
  subject: string;
  /** Hidden preview text shown by mail clients next to the subject. */
  preheader: string;
  greeting: string;
  intro: string;
  stats?: EmailStat[];
  sections: EmailSection[];
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
}
