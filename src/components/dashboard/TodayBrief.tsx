"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BoAvatar } from "@/components/brand/Logo";
import { useBo } from "@/lib/store/BoProvider";
import { briefClient } from "@/lib/ai/client";
import { todayIso } from "@/lib/utils";

/**
 * Nook's proactive daily brief — the first thing you see. Generated from your
 * real tracked items so opening the app feels like an assistant greeting you.
 * Cached per-day in sessionStorage to keep it snappy and cheap.
 */
export function TodayBrief() {
  const { data, ready } = useBo();
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (force: boolean) => {
      const cacheKey = `nook:brief:${todayIso()}`;
      if (!force) {
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            setBrief(cached);
            setLoading(false);
            return;
          }
        } catch {
          /* sessionStorage may be unavailable — ignore */
        }
      }
      setLoading(true);
      const items = data.items
        .filter((i) => i.status !== "completed" && i.status !== "dismissed")
        .slice(0, 40)
        .map((i) => ({
          title: i.title,
          category: i.category,
          status: i.status,
          due_date: i.due_date,
        }));
      const text = await briefClient({
        name: data.preferences.preferred_name,
        tone: data.preferences.tone,
        items,
        memories: data.memories.map((m) => `${m.label}: ${m.value}`),
      });
      setBrief(text);
      setLoading(false);
      if (text) {
        try {
          sessionStorage.setItem(cacheKey, text);
        } catch {
          /* ignore */
        }
      }
    },
    [data.items, data.preferences.preferred_name, data.preferences.tone, data.memories],
  );

  useEffect(() => {
    if (ready) void load(false);
    // Only run once the store is ready; refresh is manual after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-eucalypt-50 to-eucalypt-100/70 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BoAvatar size={26} />
          <p className="text-sm font-semibold text-eucalypt-800">Today with Nook</p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={loading}
          aria-label="Refresh brief"
          className="rounded-lg p-1 text-eucalypt-700 hover:bg-eucalypt-100 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !brief ? (
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-eucalypt-200/70" />
          <div className="h-3 w-full animate-pulse rounded bg-eucalypt-200/70" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-eucalypt-200/70" />
        </div>
      ) : brief ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{brief}</p>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          Here when you need me — tell me anything and I&apos;ll help you stay on top of it.
        </p>
      )}
    </div>
  );
}
