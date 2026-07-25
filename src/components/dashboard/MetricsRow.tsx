"use client";

import { useMabel } from "@/lib/store/MabelProvider";
import { formatMoney, formatMinutes } from "@/lib/utils";

/** Calm demo metrics — clearly labelled estimates, not hard promises. */
export function MetricsRow() {
  const { metrics, data } = useMabel();
  const currency = data.preferences.currency;

  const tiles = [
    { label: "Tasks handled", value: String(metrics.tasksHandled) },
    { label: "Decisions", value: String(metrics.decisionsCompleted) },
    { label: "Coming up", value: String(metrics.upcoming) },
    { label: "Est. saved", value: formatMoney(metrics.moneySaved, currency) },
    { label: "Time saved", value: formatMinutes(metrics.timeSavedMinutes) },
  ];

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="min-w-[92px] flex-1 rounded-2xl bg-white p-3 text-center shadow-soft"
          >
            <p className="text-lg font-semibold text-ink">{t.value}</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">{t.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">Estimated figures — for demonstration.</p>
    </div>
  );
}
