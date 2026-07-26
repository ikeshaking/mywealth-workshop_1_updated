"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { BoAvatar } from "@/components/brand/Logo";
import { ItemCard } from "@/components/shared/ItemCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { TodayBrief } from "@/components/dashboard/TodayBrief";
import { Composer } from "@/components/capture/Composer";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { useBo } from "@/lib/store/BoProvider";
import { dashboardSections } from "@/lib/catalog";
import { formatMoney } from "@/lib/utils";
import type { LifeItem, Status } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, transition, completeItem } = useBo();
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
              summary: `Marked as paid — you handled this one.`,
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

  const savedOptions = data.recommendationOptions.filter((o) => o.saved && !o.rejected);
  const pendingApprovals = data.approvals.filter((a) => a.status === "pending");

  return (
    <div>
      <AppHeader />
      <div className="container-app space-y-6 py-4">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {greeting()}, {data.preferences.preferred_name} 👋
          </h1>
        </div>

        {/* Proactive daily brief */}
        <TodayBrief />

        {/* Prominent capture */}
        <div>
          <Composer
            placeholder="Tell Nook anything…"
            onSend={(text) => router.push(`/capture?q=${encodeURIComponent(text)}`)}
          />
        </div>

        <MetricsRow />

        {/* Waiting on you (approvals folded in) */}
        {pendingApprovals.length > 0 && (
          <Link href="/approvals" className="block">
            <Card className="flex items-center justify-between transition-shadow hover:shadow-lift">
              <div>
                <CardTitle className="text-sm">Waiting on you</CardTitle>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {pendingApprovals.length} thing{pendingApprovals.length > 1 ? "s" : ""} to review
                  and approve
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-faint" />
            </Card>
          </Link>
        )}

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
                    body="Nook will surface things here the moment they need attention."
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

        {/* Saved shopping options */}
        {savedOptions.length > 0 && (
          <section aria-labelledby="sec-saved">
            <div className="mb-2">
              <h2 id="sec-saved" className="text-base font-semibold text-ink">
                Saved
              </h2>
              <p className="text-xs text-ink-faint">Options you kept to come back to.</p>
            </div>
            <div className="space-y-2">
              {savedOptions.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-black/[0.05] bg-white p-3 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{o.title}</p>
                    <p className="shrink-0 text-sm font-semibold text-ink">
                      {formatMoney(o.total_price, o.currency)}
                    </p>
                  </div>
                  <a
                    href={o.retailer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-eucalypt-700"
                  >
                    View at {o.retailer_label} <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Calm sign-off */}
        <div className="flex items-center gap-3 rounded-2xl bg-eucalypt-50 p-4">
          <BoAvatar size={32} />
          <p className="text-sm text-ink-soft">
            That&apos;s everything for now. Tell me anything and I&apos;ll quietly handle it.
          </p>
        </div>
      </div>
    </div>
  );
}
