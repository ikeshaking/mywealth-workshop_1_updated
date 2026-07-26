export interface WebResult {
  title: string;
  url: string;
  content: string;
}

/**
 * Live web search via Tavily (https://tavily.com) — a search API built for AI
 * apps, with a free tier. Set TAVILY_API_KEY to enable it. Returns [] when no
 * key is configured or on any failure, so callers degrade gracefully to the
 * model's own knowledge.
 */
export async function webSearch(query: string, maxResults = 6): Promise<WebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: Math.min(Math.max(maxResults, 1), 10),
        include_answer: false,
      }),
      // Don't let a slow search hang the whole request.
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const results = Array.isArray(json.results) ? json.results : [];
    return results
      .map((r) => ({
        title: String(r.title ?? ""),
        url: String(r.url ?? ""),
        content: String(r.content ?? ""),
      }))
      .filter((r) => r.url)
      .slice(0, maxResults);
  } catch {
    return [];
  }
}

/** True when live web search is configured. */
export function hasWebSearch(): boolean {
  return !!process.env.TAVILY_API_KEY?.trim();
}
