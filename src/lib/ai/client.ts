"use client";

import { extractResponseSchema, type ExtractResponse } from "../schemas";
import { fallbackExtract } from "./fallback";
import { todayIso } from "../utils";

/**
 * Calls the secure /api/extract route from the browser. If the request fails
 * for any reason (offline, server error), it falls back to the local
 * deterministic parser so capture never breaks.
 */
export async function extractClient(input: string): Promise<ExtractResponse> {
  const today = todayIso();
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, today, currency: "AUD" }),
    });
    if (!res.ok) throw new Error("extract failed");
    const json = await res.json();
    return extractResponseSchema.parse(json);
  } catch {
    return { extraction: fallbackExtract(input, today), engine: "fallback" };
  }
}
