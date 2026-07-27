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

/* ---- Per-candidate view marks (drives the manager's monthly check-ins) ---- */

const CAND_KEY = "mywealth-py:candidate-seen:v1";

function readCand(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CAND_KEY) || "{}") as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

/** When this viewer last opened each candidate's Professional Year. */
export function getCandidateSeen(viewerId: string): Record<string, string> {
  return readCand()[viewerId] ?? {};
}

/** Record that this viewer just opened a candidate's record. */
export function markCandidateSeen(
  viewerId: string,
  candidateId: string,
  iso = new Date().toISOString(),
) {
  if (typeof window === "undefined") return;
  const all = readCand();
  all[viewerId] = { ...(all[viewerId] ?? {}), [candidateId]: iso };
  try {
    localStorage.setItem(CAND_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
