"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { MabelAvatar } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RecommendationCard } from "@/components/decisions/RecommendationCard";
import { useMabel } from "@/lib/store/MabelProvider";
import { formatMoney } from "@/lib/utils";

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, setOptionFlag, approvePurchaseOption } = useMabel();
  const [tab, setTab] = useState<"picks" | "compare">("picks");

  const dr = data.decisionRequests.find((d) => d.id === id);
  const set = data.recommendationSets.find((s) => s.decision_request_id === id);
  const options = data.recommendationOptions.filter((o) => o.set_id === set?.id);

  if (!dr || !set) {
    return (
      <div>
        <AppHeader back title="Decision" />
        <div className="container-app py-10 text-center text-ink-soft">
          <p>That decision doesn&apos;t exist.</p>
          <Link href="/decisions" className="mt-3 inline-block text-eucalypt-700">
            Back to decisions
          </Link>
        </div>
      </div>
    );
  }

  const approve = (optionId: string) => {
    approvePurchaseOption(optionId);
    router.push("/approvals");
  };

  return (
    <div>
      <AppHeader back title="Options" />
      <div className="container-app space-y-4 py-4">
        {/* Request */}
        <Card className="bg-eucalypt-50/60">
          <div className="flex items-start gap-2">
            <MabelAvatar size={26} />
            <div>
              <p className="text-sm text-ink">
                <span className="italic">&ldquo;{dr.request}&rdquo;</span>
              </p>
              <p className="mt-1 text-xs text-ink-soft">{set.summary}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dr.preferences.map((p) => (
              <Badge key={p} className="bg-white text-eucalypt-700">
                {p}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="View options"
          className="flex rounded-xl bg-canvas-soft p-1 text-sm"
        >
          <button
            role="tab"
            aria-selected={tab === "picks"}
            onClick={() => setTab("picks")}
            className={`flex-1 rounded-lg py-1.5 font-medium ${tab === "picks" ? "bg-white text-eucalypt-700 shadow-soft" : "text-ink-soft"}`}
          >
            Top picks
          </button>
          <button
            role="tab"
            aria-selected={tab === "compare"}
            onClick={() => setTab("compare")}
            className={`flex-1 rounded-lg py-1.5 font-medium ${tab === "compare" ? "bg-white text-eucalypt-700 shadow-soft" : "text-ink-soft"}`}
          >
            Compare
          </button>
        </div>

        {tab === "picks" ? (
          <div className="space-y-3">
            {options.map((o) => (
              <RecommendationCard
                key={o.id}
                option={o}
                onSave={() => setOptionFlag(o.id, "saved", !o.saved)}
                onReject={() => setOptionFlag(o.id, "rejected", !o.rejected)}
                onApprove={() => approve(o.id)}
              />
            ))}
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-ink-faint">
                  <th className="p-2 font-medium">Option</th>
                  <th className="p-2 font-medium">Total</th>
                  <th className="p-2 font-medium">Best for</th>
                  <th className="p-2 font-medium">Delivery</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {options.map((o) => (
                  <tr key={o.id} className="border-t border-black/[0.05] align-top">
                    <td className="p-2 font-medium text-ink">
                      {o.title}
                      {o.is_best_match && (
                        <Badge className="ml-1 bg-eucalypt-600 text-white">Best</Badge>
                      )}
                    </td>
                    <td className="p-2 text-ink">{formatMoney(o.total_price, o.currency)}</td>
                    <td className="p-2 text-ink-soft">{o.advantages[0]}</td>
                    <td className="p-2 text-ink-soft">{o.delivery}</td>
                    <td className="p-2">
                      <Button size="sm" onClick={() => approve(o.id)}>
                        Approve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-ink-faint">
          Nothing is purchased until you approve — and no real payment is taken in demo mode.
        </p>
      </div>
    </div>
  );
}
