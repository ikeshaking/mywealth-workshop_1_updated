import { describe, it, expect } from "vitest";
import { recommendFor } from "@/lib/ai/recommend";

describe("recommendation engine", () => {
  it("returns 2-3 complete bundled options with a single best match", () => {
    const { options } = recommendFor("outdoor dining set", 2000, "GBP");
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options.length).toBeLessThanOrEqual(3);
    expect(options.filter((o) => o.is_best_match).length).toBe(1);
    // Each bundle is a complete solution (multiple line items), not a single product.
    const best = options.find((o) => o.is_best_match)!;
    expect(best.items.length).toBeGreaterThanOrEqual(2);
    expect(best.total_price).toBeGreaterThan(0);
    expect(best.advantages.length).toBeGreaterThan(0);
    expect(best.trade_offs.length).toBeGreaterThan(0);
  });

  it("keeps options within budget when a budget is given", () => {
    const { options } = recommendFor("outdoor dining set", 1500, "GBP");
    expect(options.every((o) => o.total_price <= 1500)).toBe(true);
    // Still surfaces a best match after filtering.
    expect(options.some((o) => o.is_best_match)).toBe(true);
  });

  it("routes wardrobe / internet / gift / appliance requests to distinct bundles", () => {
    expect(recommendFor("wardrobe under 1000", 1000, "GBP").options[0].title).toMatch(/wardrobe/i);
    expect(recommendFor("help me choose an internet plan", null, "GBP").options[0].title).toMatch(/fibre|net/i);
    expect(recommendFor("birthday gifts for a six-year-old", 80, "GBP").options[0].total_price).toBeLessThanOrEqual(80);
    expect(recommendFor("should i repair or replace my washing machine", null, "GBP").options.some((o) => /replace/i.test(o.title))).toBe(true);
  });
});
