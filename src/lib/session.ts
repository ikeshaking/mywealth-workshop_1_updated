"use client";

import { isLive, OWNER_EMAIL } from "./config";
import * as demo from "./auth";
import { createSupabaseBrowserClient } from "./supabase/client";

/**
 * Unified auth for both modes:
 *  - Demo: the lightweight localStorage session (src/lib/auth.ts).
 *  - Live: real Supabase email/password auth.
 * The UI calls these and doesn't care which mode is active.
 */

export interface NookSession {
  email: string;
  name: string;
  userId?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** True when Supabase requires email confirmation before sign-in. */
  needsConfirmation?: boolean;
}

export async function getCurrentSession(): Promise<NookSession | null> {
  if (!isLive) {
    const s = demo.getSession();
    return s ? { email: s.email, name: s.name } : null;
  }
  const sb = createSupabaseBrowserClient();
  const { data } = await sb.auth.getUser();
  const u = data.user;
  if (!u) return null;
  return {
    email: u.email ?? "",
    name: (u.user_metadata?.name as string) || (u.email?.split("@")[0] ?? "there"),
    userId: u.id,
  };
}

export async function signInUnified(email: string, password: string): Promise<AuthResult> {
  if (!isLive) {
    demo.signIn(email);
    return { ok: true };
  }
  const sb = createSupabaseBrowserClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signUpUnified(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isLive) {
    demo.signIn(email, name);
    return { ok: true };
  }
  if (OWNER_EMAIL && email.trim().toLowerCase() !== OWNER_EMAIL) {
    return { ok: false, error: "This Nook is private — sign-ups are limited to the owner." };
  }
  const sb = createSupabaseBrowserClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { ok: false, error: error.message };
  // If email confirmations are on, there's no session yet.
  const needsConfirmation = !data.session;
  return { ok: true, needsConfirmation };
}

export async function signOutUnified(): Promise<void> {
  if (!isLive) {
    demo.signOut();
    return;
  }
  const sb = createSupabaseBrowserClient();
  await sb.auth.signOut();
}
