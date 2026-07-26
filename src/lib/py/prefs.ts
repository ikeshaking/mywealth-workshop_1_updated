"use client";

import { isDemoMode } from "../config";

/**
 * Per-user email notification preferences. In demo mode these live in this
 * browser; in live mode they're the `notification_prefs` row that the cron jobs
 * read before sending anything.
 */
export interface Prefs {
  daily_digest: boolean;
  monthly_summary: boolean;
  at_risk_alerts: boolean;
  nudges: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  daily_digest: true,
  monthly_summary: true,
  at_risk_alerts: true,
  nudges: true,
};

const DEMO_KEY = "mywealth-py:prefs:v1";

function readDemo(): Record<string, Prefs> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || "{}") as Record<string, Prefs>;
  } catch {
    return {};
  }
}

export async function getPrefs(userId: string): Promise<Prefs> {
  if (isDemoMode) {
    return { ...DEFAULT_PREFS, ...(readDemo()[userId] ?? {}) };
  }
  const { createSupabaseBrowserClient } = await import("../supabase/client");
  const sb = createSupabaseBrowserClient();
  const { data } = await sb
    .from("notification_prefs")
    .select("daily_digest, monthly_summary, at_risk_alerts, nudges")
    .eq("user_id", userId)
    .maybeSingle();
  return { ...DEFAULT_PREFS, ...((data as Partial<Prefs>) ?? {}) };
}

export async function savePrefs(userId: string, prefs: Prefs): Promise<void> {
  if (isDemoMode) {
    const all = readDemo();
    all[userId] = prefs;
    localStorage.setItem(DEMO_KEY, JSON.stringify(all));
    return;
  }
  const { createSupabaseBrowserClient } = await import("../supabase/client");
  const sb = createSupabaseBrowserClient();
  const { error } = await sb
    .from("notification_prefs")
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
