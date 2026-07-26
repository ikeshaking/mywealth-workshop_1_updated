import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CandidateSnapshot, Recipient } from "./digest";
import type { Profile, ProgramState, Role } from "./types";

/**
 * Server-only data access for the notification cron jobs. Uses the service-role
 * key, so it deliberately bypasses RLS — these jobs legitimately need to read
 * every candidate in order to email the right person. Never import this from a
 * client component.
 */

export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface NotificationPrefs {
  daily_digest: boolean;
  monthly_summary: boolean;
  at_risk_alerts: boolean;
  nudges: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  daily_digest: true,
  monthly_summary: true,
  at_risk_alerts: true,
  nudges: true,
};

export interface ProgramData {
  profiles: Profile[];
  /** candidateId -> state */
  states: Map<string, ProgramState | null>;
  prefs: Map<string, NotificationPrefs>;
}

type ProfileRow = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  supervisor_id: string | null;
  created_at: string;
};

/** Load every profile, program state and notification preference in one pass. */
export async function loadProgramData(sb: SupabaseClient): Promise<ProgramData> {
  const [{ data: profileRows, error: pErr }, { data: stateRows }, { data: prefRows }] =
    await Promise.all([
      sb.from("profiles").select("*"),
      sb.from("program_state").select("candidate_id, state"),
      sb.from("notification_prefs").select("*"),
    ]);
  if (pErr) throw new Error(pErr.message);

  const profiles: Profile[] = ((profileRows ?? []) as ProfileRow[]).map((r) => ({
    id: r.id,
    role: r.role,
    fullName: r.full_name,
    email: r.email,
    supervisorId: r.supervisor_id,
    createdAt: r.created_at,
  }));

  const states = new Map<string, ProgramState | null>();
  for (const row of (stateRows ?? []) as { candidate_id: string; state: ProgramState }[]) {
    states.set(row.candidate_id, row.state ?? null);
  }

  const prefs = new Map<string, NotificationPrefs>();
  for (const row of (prefRows ?? []) as ({ user_id: string } & NotificationPrefs)[]) {
    prefs.set(row.user_id, {
      daily_digest: row.daily_digest,
      monthly_summary: row.monthly_summary,
      at_risk_alerts: row.at_risk_alerts,
      nudges: row.nudges,
    });
  }
  return { profiles, states, prefs };
}

export function prefsFor(data: ProgramData, userId: string): NotificationPrefs {
  return data.prefs.get(userId) ?? DEFAULT_PREFS;
}

export function toRecipient(p: Profile): Recipient {
  return { id: p.id, name: p.fullName, email: p.email };
}

/** Candidate snapshots visible to a given reviewer (supervisor or manager). */
export function candidatesFor(data: ProgramData, reviewer: Profile): CandidateSnapshot[] {
  const supName = (id: string | null) =>
    (id && data.profiles.find((p) => p.id === id)?.fullName) || "Unassigned";
  return data.profiles
    .filter((p) => p.role === "candidate")
    .filter((p) => reviewer.role === "py_manager" || p.supervisorId === reviewer.id)
    .map((p) => ({
      id: p.id,
      name: p.fullName,
      supervisorName: supName(p.supervisorId),
      state: data.states.get(p.id) ?? null,
    }));
}

/** Dedupe keys already recorded for a recipient+kind. */
export async function sentKeys(
  sb: SupabaseClient,
  recipientId: string,
  kind: string,
): Promise<Set<string>> {
  const { data } = await sb
    .from("notification_log")
    .select("dedupe_key")
    .eq("recipient_id", recipientId)
    .eq("kind", kind);
  return new Set(((data ?? []) as { dedupe_key: string }[]).map((r) => r.dedupe_key));
}

/**
 * Record that we sent something. The unique (recipient, kind, dedupe_key) index
 * is what actually prevents duplicates, so conflicts are ignored rather than
 * treated as errors.
 */
export async function recordSent(
  sb: SupabaseClient,
  recipientId: string,
  kind: string,
  dedupeKeys: string[],
  meta: Record<string, unknown> = {},
): Promise<void> {
  if (dedupeKeys.length === 0) return;
  const rows = dedupeKeys.map((dedupe_key) => ({ recipient_id: recipientId, kind, dedupe_key, meta }));
  await sb.from("notification_log").upsert(rows, {
    onConflict: "recipient_id,kind,dedupe_key",
    ignoreDuplicates: true,
  });
}

/** Public base URL used for links inside emails. */
export function appUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

/**
 * Cron endpoints are protected by a shared secret. Vercel Cron sends it as
 * `Authorization: Bearer <CRON_SECRET>`. When no secret is configured we only
 * allow the request in development, so a deployed instance is never open.
 */
export function cronAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}
