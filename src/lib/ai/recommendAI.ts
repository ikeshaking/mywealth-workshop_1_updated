import OpenAI from "openai";
import { recommendationSetAISchema, type RecommendationBundle } from "../schemas";
import { webSearch } from "./webSearch";

export interface RecommendationResult {
  summary: string;
  options: RecommendationBundle[];
  /** True when the options were grounded in live web search results. */
  grounded: boolean;
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

  // Try to ground the options in real, current listings via live web search.
  const searchQuery = [request, budget ? `under ${currency} ${budget}` : "", "buy online Australia price"]
    .filter(Boolean)
    .join(" ");
  const results = await webSearch(searchQuery, 6);
  const grounded = results.length > 0;
  const resultsBlock = grounded
    ? [
        "LIVE WEB SEARCH RESULTS (use these as your source of truth — real products, prices and links):",
        ...results.map(
          (r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 500)}`,
        ),
      ].join("\n\n")
    : "";

  const system = [
    "You are Nook, a shrewd, practical shopping researcher for someone in Australia.",
    "Given their request, produce 2–3 COMPLETE options that genuinely fit what they asked — the right product type, style, size, colour and use. Never return an unrelated product.",
    budget
      ? `Budget: keep every option at or under ${currency} ${budget}. Mark the best value-for-money one within budget as the best match.`
      : "Suggest a sensible price range and mark the best value one as the best match.",
    grounded
      ? "Base your options on the LIVE WEB SEARCH RESULTS below. Use the ACTUAL product names, prices and URLs from them. 'retailer_url' must be a real URL taken from the results (prefer the direct product page). If a result doesn't show a price, estimate sensibly and say so in the notes. Do not invent products that aren't supported by the results."
      : "Use REAL, well-known Australian retailers appropriate to the category — e.g. furniture: Koala, Castlery, Temple & Webster, Amart, IKEA, Fantastic Furniture; electronics: JB Hi-Fi, Officeworks; home/hardware: Bunnings, Kmart. 'retailer_url' MUST be that retailer's real main website, never an invented product link. You do NOT have live prices — estimate honestly and never claim a price is current.",
    'Return JSON ONLY: { "summary": one honest line, "options": [ { "title", "total_price": number, "is_best_match": boolean, "items": [ { "name", "price": number, "note"? } ], "advantages": [..], "trade_offs": [..], "why_it_suits", "retailer_label", "retailer_url", "delivery", "sizing_notes": string|null } ] }.',
    "Exactly ONE option has is_best_match=true. Keep advantages/trade_offs to 2–3 short bullets each. Concrete, honest, plain Australian English.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Request: ${request}`,
    preferences.length ? `Stated preferences: ${preferences.join(", ")}` : "",
    `Currency: ${currency}.`,
    resultsBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

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
    return { summary: parsed.data.summary, options, grounded };
  } catch {
    return null;
  }
}
