"use client";

/**
 * Remembers when a reviewer (supervisor / PY manager) last looked at the app, so
 * the dashboard can show "what your candidates did since you were last here".
 * Stored per viewer in this browser — it's a read-marker, not shared data.
 */
const KEY = "mywealth-py:last-seen:v1";

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/** The previous visit's timestamp for this viewer (undefined on first ever visit). */
export function getLastSeen(viewerId: string): string | undefined {
  return readAll()[viewerId];
}

/** Record "seen now" for this viewer. */
export function markSeen(viewerId: string, iso = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[viewerId] = iso;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
