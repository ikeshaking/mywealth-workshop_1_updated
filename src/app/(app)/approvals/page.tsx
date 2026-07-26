"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app/AppHeader";
import { BoAvatar } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBo } from "@/lib/store/BoProvider";
import { formatMoney, formatDateTime } from "@/lib/utils";
import type { Approval } from "@/lib/types";
import { RotateCcw, ShieldCheck } from "lucide-react";

export default function ApprovalsPage() {
  const { data, resolveApproval } = useBo();
  const [tab, setTab] = useState<"pending" | "history">("pending");

  const itemTitle = (a: Approval) =>
    data.items.find((i) => i.id === a.item_id)?.title ?? "Item";

  const pending = data.approvals.filter((a) => a.status === "pending");
  const history = data.approvals
    .filter((a) => a.status !== "pending")
    .sort((a, b) => (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""));

  const handleApprove = (a: Approval) => {
    const cancelling = /cancel/i.test(a.action);
    resolveApproval(a.id, "approved", {
      money_saved: cancelling ? 359.4 : 0,
      time_saved_minutes: 20,
      summary: cancelling
        ? `${a.action} — confirmed (simulated). No further charges.`
        : `${a.action} — prepared and confirmed (simulated).`,
    });
  };

  return (
    <div>
      <AppHeader title="Approvals" />
      <div className="container-app space-y-4 py-4">
        {/* Trust banner */}
        <div className="flex items-start gap-2 rounded-2xl bg-eucalypt-50 p-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-eucalypt-600" />
          <p className="text-xs text-ink-soft">
            Bo never takes an external action without your say-so. Everything here is{" "}
            <span className="font-medium text-ink">simulated</span> in demo mode — no real payments,
            bookings or cancellations happen.
          </p>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex rounded-xl bg-canvas-soft p-1 text-sm">
          <button
            role="tab"
            aria-selected={tab === "pending"}
            onClick={() => setTab("pending")}
            className={`flex-1 rounded-lg py-1.5 font-medium ${tab === "pending" ? "bg-white text-eucalypt-700 shadow-soft" : "text-ink-soft"}`}
          >
            Pending {pending.length > 0 && `(${pending.length})`}
          </button>
          <button
            role="tab"
            aria-selected={tab === "history"}
            onClick={() => setTab("history")}
            className={`flex-1 rounded-lg py-1.5 font-medium ${tab === "history" ? "bg-white text-eucalypt-700 shadow-soft" : "text-ink-soft"}`}
          >
            History
          </button>
        </div>

        {tab === "pending" ? (
          pending.length === 0 ? (
            <EmptyState icon="✅" title="Nothing to approve" body="You're all caught up." />
          ) : (
            <div className="space-y-3">
              {pending.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start gap-2">
                    <BoAvatar size={26} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/items/${a.item_id}`}
                        className="text-xs font-medium text-eucalypt-700"
                      >
                        {itemTitle(a)}
                      </Link>
                      <p className="mt-0.5 text-sm font-semibold text-ink">{a.action}</p>
                      <p className="mt-1 text-sm text-ink-soft">{a.reason}</p>

                      <dl className="mt-3 space-y-1.5 rounded-xl bg-canvas-soft p-3 text-xs">
                        <Detail label="Expected cost">
                          {a.expected_cost === null
                            ? "None"
                            : formatMoney(a.expected_cost, data.preferences.currency)}
                        </Detail>
                        <Detail label="What&apos;s shared">{a.shares}</Detail>
                        <Detail label="Reversible?">
                          {a.reversible ? (
                            <span className="text-emerald-700">Yes — can be undone</span>
                          ) : (
                            <span className="text-clay-600">No</span>
                          )}
                        </Detail>
                      </dl>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleApprove(a)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => resolveApproval(a.id, "snoozed")}
                        >
                          Snooze
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resolveApproval(a.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : history.length === 0 ? (
          <EmptyState icon="🕊️" title="No history yet" body="Approved and declined actions appear here." />
        ) : (
          <div className="space-y-2.5">
            {history.map((a) => (
              <Card key={a.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{a.action}</p>
                  <p className="text-xs text-ink-faint">
                    {itemTitle(a)} · {a.resolved_at ? formatDateTime(a.resolved_at) : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      a.status === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : a.status === "rejected"
                          ? "bg-clay-100 text-clay-600"
                          : "bg-canvas-soft text-ink-soft"
                    }
                  >
                    {a.status}
                  </Badge>
                  {a.status === "approved" && (
                    <button
                      title="Undo simulated action"
                      aria-label="Undo simulated action"
                      onClick={() => resolveApproval(a.id, "snoozed")}
                      className="rounded-lg p-1.5 text-ink-faint hover:bg-eucalypt-50"
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}
