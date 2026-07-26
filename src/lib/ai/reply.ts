import type { Extraction } from "../schemas";
import type { BoTone } from "../types";
import { categoryMeta } from "../catalog";
import { relativeDay } from "../utils";

/**
 * Turns an extraction into Bo's confirmation, in the user's chosen tone.
 * Never judgemental; always offers a next step. The "calm" tone keeps the
 * original wording ("Got it. I've added your …").
 */
export function boReply(extraction: Extraction, tone: BoTone = "calm"): string {
  const cat = categoryMeta[extraction.category].label.toLowerCase();
  const title = extraction.title.toLowerCase();

  if (extraction.is_decision) {
    const byTone: Record<BoTone, string> = {
      calm: "Got it — I've pulled together some complete options for you. Take a look and I'll handle the rest once you pick a favourite. Nothing is bought until you approve.",
      friend:
        "Ooh, fun one 🙌 I've lined up a few complete options — have a squiz and I'll sort the rest once you pick a fave. Nothing's bought till you say so.",
      witty:
        "On it — I've done the digging so you don't have to. A few complete options below; pick a winner and I'll take it from there. No purchases until you approve, promise.",
      concise:
        "Options ready below — pick a favourite and I'll handle the rest. Nothing's bought until you approve.",
    };
    return byTone[tone];
  }

  const openerByTone: Record<BoTone, string> = {
    calm: `Got it. I've added your ${title} as a ${cat} and I'm keeping an eye on it.`,
    friend: `Done! ✅ Added your ${title} as a ${cat} — I've got my eye on it for you.`,
    witty: `Consider it noted — your ${title} is now a ${cat} on my watch.`,
    concise: `Added: ${title} (${cat}).`,
  };
  const opener = openerByTone[tone];

  if (extraction.follow_up_question) {
    return `${opener} ${extraction.follow_up_question}`;
  }

  if (extraction.due_date) {
    const tail: Record<BoTone, string> = {
      calm: `It's due ${relativeDay(extraction.due_date).toLowerCase()} — I'll remind you in good time. Want me to prepare it?`,
      friend: `Due ${relativeDay(extraction.due_date).toLowerCase()} — I'll nudge you in plenty of time 🙂 Want me to get it ready?`,
      witty: `Due ${relativeDay(extraction.due_date).toLowerCase()}. I'll remind you before it becomes a problem. Prep it now?`,
      concise: `Due ${relativeDay(extraction.due_date).toLowerCase()}. Prepare it?`,
    };
    return `${opener} ${tail[tone]}`;
  }

  const tail: Record<BoTone, string> = {
    calm: "I'll suggest the next step whenever you're ready — no rush.",
    friend: "I'll pop up the next step whenever you're ready — no rush at all 🙂",
    witty: "I'll nudge you toward the next step when you're ready. No pressure.",
    concise: "I'll suggest the next step when you're ready.",
  };
  return `${opener} ${tail[tone]}`;
}
