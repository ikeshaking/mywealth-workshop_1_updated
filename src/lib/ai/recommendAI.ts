import OpenAI from "openai";
import { recommendationSetAISchema, type RecommendationBundle } from "../schemas";

export interface RecommendationResult {
  summary: string;
  options: RecommendationBundle[];
}

/**
 * Generate real, relevant shopping/decision options for a request using OpenAI.
 * The model has no live prices, so it uses realistic estimates and real, known
 * Australian retailers — framed honestly. Returns null on any failure so the
 * caller can fall back to the offline bundle bank.
 */
export async function recommendAI(
  request: string,
  budget: number | null,
  currency: string,
  preferences: string[],
): Promise<RecommendationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 3 });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = [
    "You are Nook, a shrewd, practical shopping researcher for someone in Australia.",
    "Given their request, produce 2–3 COMPLETE options that genuinely fit what they asked — the right product type, style, size, colour and use. Never return an unrelated product.",
    budget
      ? `Budget: keep every option at or under ${currency} ${budget}. Mark the best value-for-money one within budget as the best match.`
      : "Suggest a sensible price range and mark the best value one as the best match.",
    "Use REAL, well-known Australian retailers appropriate to the category — e.g. furniture: Koala, Castlery, Temple & Webster, Amart, IKEA, Fantastic Furniture; electronics: JB Hi-Fi, Officeworks; home/hardware: Bunnings, Kmart. 'retailer_url' MUST be that retailer's real main website (e.g. https://www.templeandwebster.com.au), never an invented product link.",
    "You do NOT have live prices or stock — give realistic estimates from general knowledge and keep totals honest. Do not claim a price is current or guaranteed.",
    'Return JSON ONLY: { "summary": one honest line, "options": [ { "title", "total_price": number, "is_best_match": boolean, "items": [ { "name", "price": number, "note"? } ], "advantages": [..], "trade_offs": [..], "why_it_suits", "retailer_label", "retailer_url", "delivery", "sizing_notes": string|null } ] }.',
    "Exactly ONE option has is_best_match=true. Keep advantages/trade_offs to 2–3 short bullets each. Concrete, honest, plain Australian English.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Request: ${request}`,
    preferences.length ? `Stated preferences: ${preferences.join(", ")}` : "",
    `Currency: ${currency}.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.5,
      max_tokens: 1300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = recommendationSetAISchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;

    const options = parsed.data.options;
    // Guarantee exactly one best match.
    if (!options.some((o) => o.is_best_match) && options[0]) options[0].is_best_match = true;
    return { summary: parsed.data.summary, options };
  } catch {
    return null;
  }
}
