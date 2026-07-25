import type { Extraction } from "../schemas";
import { categoryMeta } from "../catalog";
import { relativeDay } from "../utils";

/**
 * Turns an extraction into Mabel's warm, plain-language confirmation. Never
 * judgemental; always offers a next step. Mirrors the tone in the brief:
 * "Got it. I've added your car registration…".
 */
export function mabelReply(extraction: Extraction): string {
  const cat = categoryMeta[extraction.category].label.toLowerCase();

  if (extraction.is_decision) {
    return `Got it — I've pulled together some complete options for you. Take a look and I'll handle the rest once you pick a favourite. Nothing is bought until you approve.`;
  }

  const opener = `Got it. I've added your ${extraction.title.toLowerCase()} as a ${cat} and I'm keeping an eye on it.`;

  if (extraction.follow_up_question) {
    return `${opener} ${extraction.follow_up_question}`;
  }

  if (extraction.due_date) {
    return `${opener} It's due ${relativeDay(extraction.due_date).toLowerCase()} — I'll remind you in good time. Want me to prepare it?`;
  }

  return `${opener} I'll suggest the next step whenever you're ready — no rush.`;
}
