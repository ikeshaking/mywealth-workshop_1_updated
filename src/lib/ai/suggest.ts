import type { BoTone } from "../types";

/**
 * Offline "thinking partner" replies for demo mode (no OpenAI key). These are
 * genuinely useful canned suggestions for the most common everyday asks —
 * movies, meals, party & holiday planning, pros/cons — so the app feels alive
 * without a key. With OpenAI configured, /api/chat replaces this with real,
 * personalised reasoning.
 */

export interface SuggestReply {
  /** Bo's conversational reply (markdown-light plain text). */
  reply: string;
  /** Optional short title if the user chooses to save this thought. */
  saveTitle: string;
}

function opener(tone: BoTone, calm: string, friend: string, witty: string, concise: string) {
  return { friend, calm, witty, concise }[tone];
}

export function demoSuggest(text: string, tone: BoTone): SuggestReply {
  const q = text.toLowerCase();

  // --- Movies -------------------------------------------------------------
  if (/\b(movie|film|watch|netflix|stream|series|show)\b/.test(q)) {
    const chick = /\b(chick flick|rom.?com|romance|romantic|feel.?good)\b/.test(q);
    const head = opener(
      tone,
      "Good pick for a night in. Three to choose from — my favourite first:",
      "Ooh, cosy night sorted 💕 Three that'll hit the spot, best one first:",
      "Say no more — snacks mandatory, three that deliver:",
      "Three, best first:",
    );
    const list = chick
      ? "1. **The Holiday** — warm, funny, endlessly re-watchable.\n2. **Notting Hill** — classic comfort romance.\n3. **Crazy Rich Asians** — glossy, funny, big-hearted."
      : "1. **Everything Everywhere All At Once** — wild, moving, brilliant.\n2. **The Grand Budapest Hotel** — witty and gorgeous.\n3. **Knives Out** — clever, fun, easy watch.";
    return {
      reply: `${head}\n\n${list}\n\nWant a different mood, or should I check where each is streaming?`,
      saveTitle: "Movie night shortlist",
    };
  }

  // --- Meals / meal prep --------------------------------------------------
  if (/\b(meal|dinner|lunch|cook|recipe|prep|eat|food)\b/.test(q)) {
    const head = opener(
      tone,
      "Here's a cheap, quick plan for the week — roughly $45 total, each about 20 minutes:",
      "On it! Cheap and speedy week ahead 🙌 ~$45 all up, ~20 min each:",
      "Budget-friendly and fast — future-you will be thrilled:",
      "4 meals, ~$45, ~20 min each:",
    );
    return {
      reply: `${head}\n\n1. **Chicken & veg stir-fry** — batch the sauce.\n2. **Sausage & sweet-potato tray bake** — one tray, minimal washing up.\n3. **Pesto pasta with peas & spinach** — 15 minutes flat.\n4. **Loaded lentil tacos** — cheap, filling, freezes well.\n\nWant a shopping list, or swap any of these?`,
      saveTitle: "This week's meal plan",
    };
  }

  // --- Birthday / party planning -----------------------------------------
  if (/\b(party|birthday|bday|celebration)\b/.test(q)) {
    const head = opener(
      tone,
      "Let's make this easy. Here's a starter plan you can shape:",
      "Yes! Party mode 🎉 Here's a starter plan we can shape together:",
      "Party planning, activated. Here's the game plan:",
      "Starter plan:",
    );
    return {
      reply: `${head}\n\n• **Date & venue** — pick a date, home or a park?\n• **Guest list & invites** — I can draft the invite text.\n• **Cake & food** — order or DIY?\n• **Activities** — 2–3 to keep everyone busy.\n• **Party bags & budget** — I'll track spend.\n\nWant me to suggest a few themes, or draft the invite first?`,
      saveTitle: "Party plan",
    };
  }

  // --- Holiday / travel ---------------------------------------------------
  if (/\b(holiday|trip|travel|getaway|vacation|weekend away)\b/.test(q)) {
    const head = opener(
      tone,
      "Fun. Here are three directions to start from — tell me the vibe and budget and I'll go deeper:",
      "Ooh yes, let's dream a little ✈️ Three ideas to start — say the vibe and budget and I'll dig in:",
      "Holiday plotting — my favourite. Three starting points:",
      "Three starting points — give me vibe + budget:",
    );
    return {
      reply: `${head}\n\n1. **Warm & relaxed** — a beach town, minimal planning.\n2. **City & culture** — food, walking, a couple of sights.\n3. **Nature reset** — national park or a coastal drive.\n\nOnce you pick, I'll suggest dates, rough costs, a packing list and flag travel insurance.`,
      saveTitle: "Holiday ideas",
    };
  }

  // --- Pros & cons / decisions -------------------------------------------
  if (/\b(pros?( and | \/ | )cons?|should i|worth it|decide|decision|or not)\b/.test(q)) {
    const head = opener(
      tone,
      "Happy to think this through with you. Lay out the options and any constraints (budget, timing, must-haves) and I'll give you a clear pros/cons and a recommendation.",
      "Love a good think-through 🤔 Tell me the options and what matters most (budget, timing, must-haves) and I'll map the pros/cons and give you my take.",
      "Decisions, decisions. Give me the options and your dealbreakers — I'll referee with a proper pros/cons and a verdict.",
      "Give me the options + your constraints; I'll return pros/cons and a pick.",
    );
    return { reply: head, saveTitle: "Decision to weigh up" };
  }

  // --- Fallback: reflective, still helpful --------------------------------
  const head = opener(
    tone,
    "I'm with you — tell me a bit more about what you're after (and any budget, timing or must-haves) and I'll come back with a short, clear shortlist.",
    "Got it — give me a touch more (what you're after, any budget or timing) and I'll pull together a few great options 🙂",
    "Intriguing. Give me the details and I'll turn it into something useful — shortlist, plan, or a proper pros/cons.",
    "Tell me a bit more (what, budget, timing) and I'll return a short shortlist.",
  );
  return { reply: head, saveTitle: "Thought for Bo" };
}
