import type { Extraction } from "../schemas";
import { fallbackExtract } from "./fallback";
import { openaiExtract } from "./openai";
import { todayIso } from "../utils";

export interface ExtractResult {
  extraction: Extraction;
  engine: "openai" | "fallback";
}

/**
 * Orchestrates extraction: try OpenAI when configured, otherwise (or on any
 * failure) use the deterministic fallback parser. Always returns a valid,
 * schema-conformant result.
 */
export async function extract(input: string, today = todayIso()): Promise<ExtractResult> {
  const viaOpenAI = await openaiExtract(input, today);
  if (viaOpenAI) return { extraction: viaOpenAI, engine: "openai" };
  return { extraction: fallbackExtract(input, today), engine: "fallback" };
}
