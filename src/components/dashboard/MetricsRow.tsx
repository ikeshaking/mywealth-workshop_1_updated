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
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-2xl bg-white p-3 text-center shadow-soft"
          >
            <p className="truncate text-lg font-semibold text-ink">{t.value}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-ink-faint">{t.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">Estimated figures — for demonstration.</p>
    </div>
  );
}
