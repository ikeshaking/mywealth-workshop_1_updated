import type { RecommendationOption } from "../types";
import { id } from "../utils";

/**
 * Mock recommendation engine. Returns 2–3 complete, bundled solutions for a
 * decision/shopping request (never isolated products) with a clear best match.
 *
 * This is realistic mocked data — no live retailer calls — so demo mode works
 * offline. Each bundle already includes every item needed for a complete
 * outcome (e.g. table + chairs + cover for an outdoor dining set).
 */

type Bundle = Omit<RecommendationOption, "id" | "set_id" | "saved" | "rejected">;

function scaleToBudget(bundles: Bundle[], budget: number | null): Bundle[] {
  if (!budget) return bundles;
  // Keep bundles at or under budget; ensure at least one best match remains.
  const within = bundles.filter((b) => b.total_price <= budget);
  return within.length ? within : bundles;
}

function outdoorDining(currency: string): Bundle[] {
  return [
    {
      title: "Haven 7-Piece Outdoor Setting",
      is_best_match: true,
      total_price: 1699,
      currency,
      items: [
        { name: "Haven acacia dining table (seats 6)", price: 899 },
        { name: "6 × Haven weatherproof chairs", price: 660, note: "with cushions" },
        { name: "All-weather furniture cover", price: 79 },
        { name: "Delivery & assembly", price: 61 },
      ],
      advantages: [
        "Seats six comfortably",
        "Weather-resistant acacia + powder-coated frame",
        "Cover and assembly included — a complete outcome",
      ],
      trade_offs: ["Table is a fixed size (no extension leaf)"],
      why_it_suits:
        "The best balance of style, durability and price within your budget — and it arrives assembled so there's nothing left to sort.",
      retailer_label: "GardenCo (mock retailer)",
      retailer_url: "https://example.com/haven-7-piece",
      delivery: "Free delivery in 5–7 days, assembly included",
      sizing_notes: "Table 180 × 90 cm — fits a 6-seat patio with room to move.",
    },
    {
      title: "Coastal 6-Seater Dining Set",
      is_best_match: false,
      total_price: 1399,
      currency,
      items: [
        { name: "Coastal rope-weave table (seats 6)", price: 749 },
        { name: "6 × Coastal stacking chairs", price: 570 },
        { name: "Protective cover", price: 80 },
      ],
      advantages: ["Great value", "Chairs stack to save space", "Lighter, easy to move"],
      trade_offs: ["Assembly required (~45 min)", "Cushions sold separately"],
      why_it_suits:
        "The most affordable complete set that still seats six — ideal if you want to keep well under budget.",
      retailer_label: "Patio Direct (mock retailer)",
      retailer_url: "https://example.com/coastal-6-seater",
      delivery: "Free delivery in 3–5 days",
      sizing_notes: "Table 160 × 90 cm — a snug six, comfortable four.",
    },
    {
      title: "Porto Premium Outdoor Set",
      is_best_match: false,
      total_price: 1899,
      currency,
      items: [
        { name: "Porto extendable table (6–8 seats)", price: 1099 },
        { name: "6 × Porto cushioned armchairs", price: 720 },
        { name: "Premium fitted cover", price: 80 },
      ],
      advantages: [
        "Extends to seat eight",
        "Premium all-weather cushions",
        "Most durable frame",
      ],
      trade_offs: ["Closest to your budget ceiling", "Heavier to reposition"],
      why_it_suits:
        "The premium pick if you sometimes host more than six — the extension leaf earns its place.",
      retailer_label: "Outdoor Living (mock retailer)",
      retailer_url: "https://example.com/porto-premium",
      delivery: "Delivery in 7–10 days, assembly $49 extra",
      sizing_notes: "Extends 180 → 240 cm. Check you have 260 cm of clearance.",
    },
  ];
}

function wardrobe(currency: string): Bundle[] {
  return [
    {
      title: "Nord 3-Door Wardrobe Solution",
      is_best_match: true,
      total_price: 849,
      currency,
      items: [
        { name: "Nord 3-door wardrobe (150 cm wide)", price: 699 },
        { name: "Internal drawer + shelf kit", price: 90 },
        { name: "Delivery & assembly", price: 60 },
      ],
      advantages: ["Fits a standard wall", "Soft-close doors", "Assembly included"],
      trade_offs: ["150 cm may leave a gap on a wider wall"],
      why_it_suits: "A complete storage solution well under $1,000, assembled for you.",
      retailer_label: "HomeStore (mock retailer)",
      retailer_url: "https://example.com/nord-wardrobe",
      delivery: "Delivery in 7–10 days, assembly included",
      sizing_notes: "150 × 210 × 58 cm. Tell Nook your wall width to confirm the fit.",
    },
    {
      title: "Flex Modular Wardrobe",
      is_best_match: false,
      total_price: 640,
      currency,
      items: [
        { name: "2 × Flex modules (100 cm each)", price: 520 },
        { name: "Hanging + shelf inserts", price: 120 },
      ],
      advantages: ["Configure to your exact wall width", "Cheapest complete option"],
      trade_offs: ["Self-assembly (~90 min)", "No doors in base price"],
      why_it_suits: "Best when the wall is an awkward width — modules adapt to fit.",
      retailer_label: "ModularCo (mock retailer)",
      retailer_url: "https://example.com/flex-wardrobe",
      delivery: "Delivery in 4–6 days",
      sizing_notes: "Each module 100 cm — combine to match your wall.",
    },
  ];
}

function internetPlan(currency: string): Bundle[] {
  return [
    {
      title: "FibreFast 500 (switch & save)",
      is_best_match: true,
      total_price: 32,
      currency,
      items: [{ name: "500 Mbps fibre, 24-month", price: 32, note: "per month" }],
      advantages: ["$18/mo cheaper than your current plan", "No setup fee", "Faster speed"],
      trade_offs: ["24-month contract"],
      why_it_suits:
        "Saves an estimated $216 a year for faster speed — the clear best switch.",
      retailer_label: "FibreFast (mock provider)",
      retailer_url: "https://example.com/fibrefast-500",
      delivery: "Switch scheduled with no downtime",
      sizing_notes: null,
    },
    {
      title: "ValueNet 150 (no contract)",
      is_best_match: false,
      total_price: 26,
      currency,
      items: [{ name: "150 Mbps, rolling monthly", price: 26, note: "per month" }],
      advantages: ["Cheapest", "No fixed contract", "Cancel anytime"],
      trade_offs: ["Slower speed", "$25 setup fee"],
      why_it_suits: "Lowest monthly cost with total flexibility if you might move.",
      retailer_label: "ValueNet (mock provider)",
      retailer_url: "https://example.com/valuenet-150",
      delivery: "Live within 10 working days",
      sizing_notes: null,
    },
  ];
}

function birthdayGifts(currency: string, budget: number | null): Bundle[] {
  const cap = budget ?? 80;
  return [
    {
      title: "Little Explorer Bundle",
      is_best_match: true,
      total_price: Math.min(cap, 72),
      currency,
      items: [
        { name: "STEM building set", price: 34 },
        { name: "Illustrated adventure book set", price: 22 },
        { name: "Gift wrap + card", price: 6 },
      ],
      advantages: ["Age-appropriate for six", "Mix of play + learning", "Gift-wrapped"],
      trade_offs: ["Batteries not included for one item"],
      why_it_suits: "A complete, wrapped gift under budget that a six-year-old will love.",
      retailer_label: "ToyBox (mock retailer)",
      retailer_url: "https://example.com/little-explorer",
      delivery: "Free delivery in 2–3 days, gift-wrapped",
      sizing_notes: "Recommended age 5–8.",
    },
    {
      title: "Creative Kid Set",
      is_best_match: false,
      total_price: Math.min(cap, 58),
      currency,
      items: [
        { name: "Art & craft mega kit", price: 39 },
        { name: "Washable marker set", price: 13 },
        { name: "Gift wrap + card", price: 6 },
      ],
      advantages: ["Screen-free", "Keeps them busy for hours", "Lower cost"],
      trade_offs: ["Can be messy"],
      why_it_suits: "Great value creative gift, comfortably under budget.",
      retailer_label: "CraftLand (mock retailer)",
      retailer_url: "https://example.com/creative-kid",
      delivery: "Free delivery in 2–4 days",
      sizing_notes: "Recommended age 4–7.",
    },
  ];
}

function repairOrReplace(currency: string): Bundle[] {
  return [
    {
      title: "Replace: Aria 8kg Washing Machine",
      is_best_match: true,
      total_price: 429,
      currency,
      items: [
        { name: "Aria 8kg A-rated washing machine", price: 379 },
        { name: "Delivery, install & old-appliance removal", price: 50 },
      ],
      advantages: [
        "Cheaper than a likely $180 repair over 2 years",
        "A-rated — lower running costs",
        "2-year warranty resets the clock",
      ],
      trade_offs: ["Upfront cost is higher than a single repair"],
      why_it_suits:
        "Your machine is 9 years old; replacing beats repairing on total cost of ownership.",
      retailer_label: "ApplianceCo (mock retailer)",
      retailer_url: "https://example.com/aria-washer",
      delivery: "Next-day delivery + installation",
      sizing_notes: "60 × 85 × 60 cm — standard under-counter fit.",
    },
    {
      title: "Repair: Engineer call-out + part",
      is_best_match: false,
      total_price: 180,
      currency,
      items: [
        { name: "Engineer call-out", price: 80 },
        { name: "Drum bearing part + labour", price: 100 },
      ],
      advantages: ["Lowest upfront cost", "Keeps a familiar machine"],
      trade_offs: ["No warranty on the rest of the machine", "May fail again within a year"],
      why_it_suits: "Sensible if you're moving soon and just need it working short-term.",
      retailer_label: "FixIt Local (mock service)",
      retailer_url: "https://example.com/fixit-washer",
      delivery: "Engineer within 3 working days",
      sizing_notes: null,
    },
  ];
}

/** Pick the right mock bundle set for a request. */
export function recommendFor(
  request: string,
  budget: number | null,
  currency = "AUD",
): { summary: string; options: RecommendationOption[] } {
  const q = request.toLowerCase();
  let bundles: Bundle[];
  let summary: string;

  if (/wardrobe|storage|closet/.test(q)) {
    bundles = wardrobe(currency);
    summary = "Three complete wardrobe solutions, sized to fit and within budget.";
  } else if (/internet|broadband|wifi|wi-fi|plan/.test(q)) {
    bundles = internetPlan(currency);
    summary = "Two switch options — one to save the most, one for flexibility.";
  } else if (/gift|present|birthday/.test(q)) {
    bundles = birthdayGifts(currency, budget);
    summary = "Complete, gift-wrapped bundles under budget.";
  } else if (/repair or replace|washing machine|washer|fridge|dishwasher|appliance/.test(q)) {
    bundles = repairOrReplace(currency);
    summary = "A clear repair-vs-replace comparison with total cost of ownership.";
  } else {
    bundles = outdoorDining(currency);
    summary = "Three complete outdoor dining solutions — table, chairs and cover included.";
  }

  bundles = scaleToBudget(bundles, budget);
  const setId = id("recset");
  const options: RecommendationOption[] = bundles.map((b) => ({
    ...b,
    id: id("recopt"),
    set_id: setId,
    saved: false,
    rejected: false,
  }));

  // Guarantee exactly one best match survives budget filtering.
  if (!options.some((o) => o.is_best_match) && options[0]) options[0].is_best_match = true;

  return { summary, options };
}
