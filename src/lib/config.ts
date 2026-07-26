/**
 * Runtime configuration.
 *
 * - Demo mode (default): no env vars needed. In-browser store, offline AI.
 * - Live mode: set the Supabase env vars + NEXT_PUBLIC_DEMO_MODE=false. Real
 *   email/password login and Postgres persistence tied to your account.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false"; // default: demo

export const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the app should use real Supabase auth + persistence. */
export const isLive = hasSupabase && process.env.NEXT_PUBLIC_DEMO_MODE === "false";

/**
 * Optional: lock sign-ups to a single email so the app stays private to you.
 * Set NEXT_PUBLIC_OWNER_EMAIL to your email; leave unset to allow any.
 */
export const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "").trim().toLowerCase();

export const STORAGE_KEY = "bo:data:v1";
export const AUTH_KEY = "bo:auth:v1";
