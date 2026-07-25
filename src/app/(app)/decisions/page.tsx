"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { Card } from "@/components/ui/Card";
import { Composer } from "@/components/capture/Composer";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useMabel } from "@/lib/store/MabelProvider";
import { formatMoney } from "@/lib/utils";

export default function DecisionsPage() {
  const router = useRouter();
  const { data } = useMabel();

  const decisions = [...data.decisionRequests].reverse();

  return (
    <div>
      <AppHeader title="Decisions & shopping" />
      <div className="container-app space-y-4 py-4">
        <p className="text-sm text-ink-soft">
          Ask Mabel to research anything — she returns complete options, not a wall of products.
        </p>
        <Composer
          placeholder="Find me… / Help me choose… / Should I…"
          onSend={(text) => router.push(`/capture?q=${encodeURIComponent(text)}`)}
        />

        {decisions.length === 0 ? (
          <EmptyState
            icon="🧭"
            title="No decisions yet"
            body="Try “Find me an outdoor dining set under $2,000 that seats six.”"
          />
        ) : (
          <div className="space-y-3">
            {decisions.map((dr) => {
              const set = data.recommendationSets.find((s) => s.decision_request_id === dr.id);
              const options = data.recommendationOptions.filter((o) => o.set_id === set?.id);
              const best = options.find((o) => o.is_best_match) ?? options[0];
              return (
                <Link key={dr.id} href={`/decisions/${dr.id}`} className="block">
                  <Card className="transition-shadow hover:shadow-lift">
                    <p className="text-sm font-semibold text-ink">{dr.request}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dr.preferences.map((p) => (
                        <Badge key={p} className="bg-eucalypt-50 text-eucalypt-600">
                          {p}
                        </Badge>
                      ))}
                    </div>
                    {best && (
                      <p className="mt-2 text-xs text-ink-soft">
                        Best match: <span className="font-medium text-ink">{best.title}</span> ·{" "}
                        {formatMoney(best.total_price, best.currency)} · {options.length} options
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
