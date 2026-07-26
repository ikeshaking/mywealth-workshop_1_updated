import { z } from "zod";
import { CATEGORIES, PRIORITIES } from "./types";

/**
 * Strict Zod schema for the AI extraction result. Both the OpenAI-backed
 * extractor and the deterministic fallback parser return objects that satisfy
 * this schema, so the rest of the app only ever deals with validated data.
 *
 * Guardrails baked in:
 *  - dates are nullable and must be ISO `YYYY-MM-DD` when present (the model is
 *    instructed never to invent a precise date it wasn't given);
 *  - confidence is clamped to 0..1;
 *  - `missing_information` captures what Bo still needs to ask about.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)")
  .nullable();

export const extractionSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  due_date: isoDate,
  reminder_date: isoDate,
  follow_up_date: isoDate,
  missing_information: z.array(z.string()).default([]),
  recommended_action: z.string().min(1).max(200),
  approval_required: z.boolean(),
  confidence_score: z.number().min(0).max(1),
  /** A short, supportive follow-up question — only when genuinely needed. */
  follow_up_question: z.string().nullable().default(null),
  /** True when the request is a research/shopping/decision ask. */
  is_decision: z.boolean().default(false),
  /** Parsed budget if the user named one (e.g. "under $2,000"). */
  budget: z.number().nonnegative().nullable().default(null),
  currency: z.string().length(3).default("AUD"),
});

export type Extraction = z.infer<typeof extractionSchema>;

/** Request body accepted by POST /api/extract. */
export const extractRequestSchema = z.object({
  input: z.string().min(1, "Tell Bo something first.").max(2000),
  currency: z.string().length(3).default("AUD"),
  /** ISO date of "today" so the fallback parser can resolve relative dates. */
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

export const extractResponseSchema = z.object({
  extraction: extractionSchema,
  /** "openai" or "fallback" — surfaced so the UI can label demo behaviour. */
  engine: z.enum(["openai", "fallback"]),
});
export type ExtractResponse = z.infer<typeof extractResponseSchema>;

/** Onboarding form. */
export const onboardingSchema = z.object({
  preferred_name: z.string().min(1, "What should Bo call you?").max(60),
  household_type: z.enum(["solo", "couple", "family", "shared"]),
  focus_areas: z.array(z.enum(CATEGORIES)).min(1, "Pick at least one area."),
  notification_preference: z.enum(["all", "important", "quiet"]),
  proactive_suggestions: z.boolean(),
});
export type OnboardingValues = z.infer<typeof onboardingSchema>;

/** Auth forms (demo auth — no real password checks). */
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(6, "At least 6 characters."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = loginSchema.extend({
  name: z.string().min(1, "Enter your name.").max(60),
});
export type SignupValues = z.infer<typeof signupSchema>;
