"use client";

import { AppHeader } from "@/components/app/AppHeader";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { useMabel } from "@/lib/store/MabelProvider";
import { formatDate, formatMoney, formatMinutes } from "@/lib/utils";

export default function CompletedPage() {
  const { data } = useMabel();
  const completed = data.items
    .filter((i) => i.status === "completed")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  return (
    <div>
      <AppHeader title="Completed for you" />
      <div className="container-app space-y-4 py-4">
        <MetricsRow />

        {completed.length === 0 ? (
          <EmptyState
            icon="🌟"
            title="Nothing completed yet"
            body="As Mabel handles things, they'll show up here with what you saved."
          />
        ) : (
          <div className="space-y-3">
            {completed.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {item.outcome_summary ?? item.summary}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg" aria-hidden>
                    ✅
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <CategoryBadge category={item.category} />
                  <span className="text-ink-faint">
                    Completed {formatDate(item.completed_at)}
                  </span>
                  {item.money_saved ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      Saved {formatMoney(item.money_saved, data.preferences.currency)}
                    </span>
                  ) : null}
                  {item.time_saved_minutes ? (
                    <span className="rounded-full bg-lavender-50 px-2 py-0.5 font-medium text-lavender-700">
                      {formatMinutes(item.time_saved_minutes)} saved
                    </span>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
