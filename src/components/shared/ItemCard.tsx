"use client";

import Link from "next/link";
import type { LifeItem } from "@/lib/types";
import { categoryMeta } from "@/lib/catalog";
import { StatusBadge, PriorityBadge, InferredTag } from "@/components/ui/Badge";
import { relativeDay, formatMoney } from "@/lib/utils";

/**
 * The core reusable card summarising a life item. Used across the dashboard,
 * item lists and completed views. Whole card is a link to the detail screen;
 * an optional action slot renders a primary CTA on the right.
 */
export function ItemCard({
  item,
  action,
}: {
  item: LifeItem;
  action?: React.ReactNode;
}) {
  const cat = categoryMeta[item.category];
  const showDue = item.due_date && item.status !== "completed";

  return (
    <div className="group relative rounded-2xl border border-black/[0.04] bg-white p-3.5 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-eucalypt-50 text-lg"
          aria-hidden
        >
          {cat.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/items/${item.id}`}
              className="truncate text-sm font-semibold text-ink after:absolute after:inset-0 after:content-['']"
            >
              {item.title}
            </Link>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{item.summary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={item.status} />
            {item.status !== "completed" && <PriorityBadge priority={item.priority} />}
            {showDue && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                <span aria-hidden>📅</span>
                {relativeDay(item.due_date)}
                {item.inferred.due_date && <InferredTag />}
              </span>
            )}
            {item.status === "completed" && item.money_saved ? (
              <span className="text-xs font-medium text-emerald-700">
                Saved {formatMoney(item.money_saved)}
              </span>
            ) : null}
          </div>
        </div>
        {action && <div className="relative z-10 shrink-0">{action}</div>}
      </div>
    </div>
  );
}
