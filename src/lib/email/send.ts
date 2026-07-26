/**
 * Email delivery — SERVER-SIDE ONLY.
 *
 * This module reads secrets from `process.env` and talks to the Resend API
 * directly. Never import it from a client component, a shared hook, or any
 * file that ends up in the browser bundle; use it from route handlers, server
 * actions and cron routes only.
 *
 * Design goal: email is *optional*. With no credentials configured the whole
 * module degrades to a logged no-op so local development, demo mode and the
 * cron routes keep working untouched. Nothing here throws.
 */

import { renderEmail } from "./render";
import type { EmailPayload } from "./types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendResult {
  ok: boolean;
  /** True when the send was deliberately not attempted (no credentials). */
  skipped?: boolean;
  error?: string;
  /** Provider message id, when the provider returns one. */
  id?: string;
}

function readConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  // e.g. "MyWealth PY <py@yourdomain.com>"
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

/** True only when BOTH RESEND_API_KEY and EMAIL_FROM are present. */
export function emailConfigured(): boolean {
  return readConfig() !== null;
}

/**
 * Send one rendered email. Resolves to a result object in every case —
 * callers can log it and move on without try/catch.
 */
export async function sendEmail(
  to: string,
  payload: EmailPayload,
): Promise<SendResult> {
  const config = readConfig();

  if (!config) {
    console.info(
      `[email] skipped (not configured): ${payload.subject} -> ${to}`,
    );
    return { ok: true, skipped: true };
  }

  const { html, text } = renderEmail(payload);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to,
        subject: payload.subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      // Surface the provider's message where possible; it is far more useful
      // than a bare status code when debugging a domain/DNS misconfiguration.
      const detail = await response.text().catch(() => "");
      const error = `Resend responded ${response.status}${
        detail ? `: ${detail.slice(0, 300)}` : ""
      }`;
      console.error(`[email] failed: ${payload.subject} -> ${to} — ${error}`);
      return { ok: false, error };
    }

    const body: unknown = await response.json().catch(() => null);
    const id =
      body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
        ? (body as { id: string }).id
        : undefined;

    return { ok: true, id };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    console.error(`[email] failed: ${payload.subject} -> ${to} — ${error}`);
    return { ok: false, error };
  }
}

/**
 * Send a list of messages one at a time. Sequential rather than parallel to
 * stay well inside provider rate limits, and individual failures never abort
 * the run — a single bad address must not stop a nightly digest.
 */
export async function sendBatch(
  messages: { to: string; payload: EmailPayload }[],
): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const message of messages) {
    const result = await sendEmail(message.to, message.payload);
    if (result.skipped) skipped += 1;
    else if (result.ok) sent += 1;
    else failed += 1;
  }

  return { sent, skipped, failed };
}
