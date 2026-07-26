/**
 * Runtime configuration. Demo mode is the default and requires no env vars — the
 * app runs entirely in the browser with seeded accounts. Set
 * NEXT_PUBLIC_DEMO_MODE=false plus the Supabase env vars to switch to the live,
 * multi-device, real-time backend.
 */
export const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Demo mode unless explicitly disabled *and* Supabase is actually configured.
export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "false" && hasSupabase ? false : true;

export const THEME_KEY = "mywealth-py:theme";
export const DEMO_DB_KEY = "mywealth-py:demo-db:v2";
export const DEMO_SESSION_KEY = "mywealth-py:demo-session:v1";
