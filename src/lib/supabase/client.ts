import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Only used when NEXT_PUBLIC_DEMO_MODE=false and the
 * NEXT_PUBLIC_SUPABASE_* env vars are set. In demo mode this is never called —
 * the app uses the in-browser store instead.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or run in demo mode.",
    );
  }
  return createBrowserClient(url, anon);
}
