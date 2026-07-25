"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { MabelAvatar } from "@/components/brand/Logo";
import { ItemCard } from "@/components/shared/ItemCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { Composer } from "@/components/capture/Composer";
import { Button } from "@/components/ui/Button";
import { useMabel } from "@/lib/store/MabelProvider";
import { dashboardSections } from "@/lib/catalog";
import type { LifeItem, Status } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, transition, completeItem } = useMabel();
  const [showCompleted, setShowCompleted] = useState(false);

  const byStatus = (statuses: Status[]): LifeItem[] =>
    data.items
      .filter((i) => statuses.includes(i.status))
      .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));

  const quickAction = (item: LifeItem): React.ReactNode => {
    if (item.status === "ready_for_approval") {
      return (
        <Link href="/approvals">
          <Button size="sm">Review</Button>
        </Link>
      );
    }
    if (item.status === "researching" && item.decision_request_id) {
      return (
        <Link href={`/decisions/${item.decision_request_id}`}>
          <Button size="sm" variant="secondary">
            Options
          </Button>
        </Link>
      );
    }
    if (item.category === "bill" && item.status === "scheduled") {
      return (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            completeItem(item.id, {
              summary: `Paid ${item.title}.`,
              time_saved_minutes: 15,
            })
          }
        >
          Mark paid
        </Button>
      );
    }
    if (item.status === "needs_attention" || item.status === "needs_information") {
      return (
        <Link href={`/items/${item.id}`}>
          <Button size="sm" variant="secondary">
            Do it now
          </Button>
        </Link>
      );
    }
    return null;
  };

  return (
    <div>
      <AppHeader
        right={
          <Link href="/settings" aria-label="Settings" className="text-sm text-eucalypt-700">
            {data.preferences.preferred_name}
          </Link>
        }
      />
      <div className="container-app space-y-6 py-4">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {greeting()}, {data.preferences.preferred_name} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Here&apos;s what&apos;s going on today.</p>
        </div>

        {/* Prominent capture */}
        <div>
          <Composer
            placeholder="Tell Mabel anything…"
            onSend={(text) => router.push(`/capture?q=${encodeURIComponent(text)}`)}
          />
        </div>

        <MetricsRow />

        {/* Sections */}
        {dashboardSections.map((section) => {
          const items = byStatus(section.statuses);
          const isCompleted = section.key === "completed";
          if (isCompleted && items.length === 0) return null;

          const visible = isCompleted && !showCompleted ? items.slice(0, 2) : items;

          return (
            <section key={section.key} aria-labelledby={`sec-${section.key}`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 id={`sec-${section.key}`} className="text-base font-semibold text-ink">
                    {section.title}
                  </h2>
                  <p className="text-xs text-ink-faint">{section.subtitle}</p>
                </div>
                {items.length > 0 && (
                  <span className="rounded-full bg-eucalypt-100 px-2 py-0.5 text-xs font-medium text-eucalypt-700">
                    {items.length}
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                section.key === "attention" ? (
                  <EmptyState
                    icon="🌿"
                    title="Nothing needs you right now"
                    body="Mabel will surface things here the moment they need attention."
                  />
                ) : null
              ) : (
                <div className="space-y-2.5">
                  {visible.map((item) => (
                    <ItemCard key={item.id} item={item} action={quickAction(item)} />
                  ))}
                  {isCompleted && items.length > 2 && (
                    <div className="text-center">
                      {!showCompleted ? (
                        <button
                          onClick={() => setShowCompleted(true)}
                          className="text-sm font-medium text-eucalypt-700"
                        >
                          View all {items.length}
                        </button>
                      ) : (
                        <Link href="/completed" className="text-sm font-medium text-eucalypt-700">
                          Go to Completed
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {/* Calm sign-off */}
        <div className="flex items-center gap-3 rounded-2xl bg-eucalypt-50 p-4">
          <MabelAvatar size={32} />
          <p className="text-sm text-ink-soft">
            That&apos;s everything for now. Tell me anything and I&apos;ll quietly handle it.
          </p>
        </div>
      </div>
    </div>
  );
}
