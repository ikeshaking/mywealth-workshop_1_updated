/**
 * Runtime configuration. Demo mode is the default and requires no env vars.
 */
export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE !== "false"; // default: demo

export const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const STORAGE_KEY = "mabel:data:v1";
export const AUTH_KEY = "mabel:auth:v1";
