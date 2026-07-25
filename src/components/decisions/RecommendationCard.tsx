"use client";

import type { RecommendationOption } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, cn } from "@/lib/utils";
import { Check, X, ExternalLink } from "lucide-react";

/**
 * A complete bundled recommendation. Shows total price, what's included, why
 * Mabel recommends it, pros and trade-offs, and save/reject/approve controls.
 */
export function RecommendationCard({
  option,
  onSave,
  onReject,
  onApprove,
}: {
  option: RecommendationOption;
  onSave: () => void;
  onReject: () => void;
  onApprove: () => void;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-soft transition-opacity",
        option.is_best_match ? "border-eucalypt-400 ring-1 ring-eucalypt-200" : "border-black/[0.05]",
        option.rejected && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {option.is_best_match && (
            <Badge className="mb-1 bg-eucalypt-600 text-white">✦ Best match</Badge>
          )}
          <h3 className="text-base font-semibold text-ink">{option.title}</h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-ink">
            {formatMoney(option.total_price, option.currency)}
          </p>
          <p className="text-[11px] text-ink-faint">total</p>
        </div>
      </div>

      {/* What's included */}
      <div className="mt-3 rounded-xl bg-canvas-soft p-3">
        <p className="mb-1.5 text-xs font-medium text-ink-soft">What&apos;s included</p>
        <ul className="space-y-1">
          {option.items.map((line) => (
            <li key={line.name} className="flex justify-between text-sm">
              <span className="text-ink-soft">
                {line.name}
                {line.note ? <span className="text-ink-faint"> · {line.note}</span> : null}
              </span>
              <span className="text-ink">{formatMoney(line.price, option.currency)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Why */}
      <p className="mt-3 text-sm text-ink-soft">
        <span className="font-medium text-ink">Why Mabel picks this: </span>
        {option.why_it_suits}
      </p>

      {/* Pros / trade-offs */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="mb-1 font-medium text-emerald-700">Advantages</p>
          <ul className="space-y-0.5 text-ink-soft">
            {option.advantages.map((a) => (
              <li key={a} className="flex gap-1">
                <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium text-clay-600">Trade-offs</p>
          <ul className="space-y-0.5 text-ink-soft">
            {option.trade_offs.map((t) => (
              <li key={t} className="flex gap-1">
                <X size={13} className="mt-0.5 shrink-0 text-clay-500" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Delivery / sizing */}
      <div className="mt-3 space-y-1 text-xs text-ink-faint">
        <p>🚚 {option.delivery}</p>
        {option.sizing_notes && <p>📐 {option.sizing_notes}</p>}
        <a
          href={option.retailer_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-eucalypt-700"
        >
          {option.retailer_label} <ExternalLink size={12} />
        </a>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onApprove}>
          Approve purchase
        </Button>
        <Button size="sm" variant="secondary" onClick={onSave}>
          {option.saved ? "Saved ✓" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          {option.rejected ? "Rejected" : "Not for me"}
        </Button>
      </div>
    </article>
  );
}
