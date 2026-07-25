"use client";

import { AUTH_KEY } from "./config";

/**
 * Lightweight demo authentication. In demo mode we don't talk to Supabase — a
 * successful "login"/"signup" just records a session flag in localStorage. The
 * route guard (`useRequireAuth`) reads this. Swapping in real Supabase auth is
 * a matter of replacing these three functions (see README → Live mode).
 */

export interface DemoSession {
  email: string;
  name: string;
  createdAt: string;
}

export function getSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

export function signIn(email: string, name?: string): DemoSession {
  const session: DemoSession = {
    email,
    name: name || email.split("@")[0],
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function signOut() {
  localStorage.removeItem(AUTH_KEY);
}
