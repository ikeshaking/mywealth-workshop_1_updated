"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { BoAvatar } from "@/components/brand/Logo";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RecommendationCard } from "@/components/decisions/RecommendationCard";
import { useBo } from "@/lib/store/BoProvider";
import { recommendClient } from "@/lib/ai/client";
import { recommendFor } from "@/lib/ai/recommend";
import { formatMoney } from "@/lib/utils";

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, setOptionFlag, approvePurchaseOption, attachRecommendations } = useBo();
  const [tab, setTab] = useState<"picks" | "compare">("picks");
  const fetchingRef = useRef(false);

  const dr = data.decisionRequests.find((d) => d.id === id);
  const set = data.recommendationSets.find((s) => s.decision_request_id === id);
  const options = data.recommendationOptions.filter((o) => o.set_id === set?.id);

  // Self-heal: if a decision has no options yet (e.g. opened directly, or a
  // prior fetch never completed), research them now.
  useEffect(() => {
    if (!dr || options.length > 0 || fetchingRef.current) return;
    fetchingRef.current = true;
    (async () => {
      const ai = await recommendClient(dr.request, dr.budget, dr.currency, dr.preferences);
      const result = ai ?? recommendFor(dr.request, dr.budget, dr.currency);
      attachRecommendations(dr.id, result.summary, result.options);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dr?.id, options.length]);

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
            <BoAvatar size={26} />
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

        {options.length === 0 ? (
          <Card className="flex items-center gap-3">
            <BoAvatar size={30} />
            <div>
              <p className="text-sm font-medium text-ink">
                Nook is researching your best options…
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                Finding complete options that fit what you asked. Just a few seconds.
              </p>
            </div>
          </Card>
        ) : (
          <>
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
                      <a
                        href={o.retailer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-eucalypt-700"
                      >
                        View at {o.retailer_label}
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}

        <p className="text-center text-xs text-ink-faint">
          Nothing is purchased until you approve. Prices are Nook&apos;s estimates, not live quotes —
          check the retailer before buying.
        </p>
      </div>
    </div>
  );
}
