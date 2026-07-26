"use client";

import { useEffect, useState } from "react";
import { useBo } from "@/lib/store/BoProvider";
import { BoAvatar } from "@/components/brand/Logo";
import { X } from "lucide-react";

/**
 * Proactive nudge surface. On mount (and periodically) it fires any reminders
 * whose time has passed and shows the newest one as a calm, dismissible toast.
 * This is the app-level simulation of Nook's proactive nudging — no external
 * push notifications required.
 */
export function NudgeToaster() {
  const { data, runNudges } = useBo();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    runNudges();
    const t = setInterval(runNudges, 30_000);
    return () => clearInterval(t);
  }, [runNudges]);

  const latest = data.reminders
    .filter((r) => r.fired && !dismissed.includes(r.id))
    .sort((a, b) => b.fire_at.localeCompare(a.fire_at))[0];

  if (!latest) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-2xl border border-eucalypt-200 bg-white p-3 shadow-lift animate-fade-in"
      >
        <BoAvatar size={28} />
        <p className="flex-1 text-sm text-ink">{latest.message}</p>
        <button
          aria-label="Dismiss nudge"
          onClick={() => setDismissed((d) => [...d, latest.id])}
          className="rounded-lg p-1 text-ink-faint hover:bg-eucalypt-50"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
