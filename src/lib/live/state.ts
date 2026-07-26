"use client";

import type { BoData } from "../types";
import { createSupabaseBrowserClient } from "../supabase/client";

/**
 * Live persistence: the whole Nook data set is stored as one JSON row per user
 * in the `nook_state` table (see supabase/migrations). Simple, private (RLS),
 * and synced across every device you sign in on.
 */

export interface LoadedState {
  userId: string;
  email: string;
  name: string;
  data: BoData | null;
}

export async function loadLiveState(): Promise<LoadedState | null> {
  const sb = createSupabaseBrowserClient();
  const { data: userRes } = await sb.auth.getUser();
  const u = userRes.user;
  if (!u) return null;
  const { data: row } = await sb
    .from("nook_state")
    .select("data")
    .eq("user_id", u.id)
    .maybeSingle();
  return {
    userId: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string) || (u.email?.split("@")[0] ?? "there"),
    data: (row?.data as BoData) ?? null,
  };
}

export async function saveLiveState(userId: string, data: BoData): Promise<void> {
  const sb = createSupabaseBrowserClient();
  await sb.from("nook_state").upsert(
    { user_id: userId, data, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}
