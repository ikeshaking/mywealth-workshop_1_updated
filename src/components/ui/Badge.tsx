import { cn } from "@/lib/utils";
import type { Status, Priority, Category } from "@/lib/types";
import { statusMeta, priorityMeta, categoryMeta } from "@/lib/catalog";

const statusTone: Record<string, string> = {
  neutral: "bg-canvas-soft text-ink-soft",
  attention: "bg-clay-100 text-clay-600",
  progress: "bg-eucalypt-100 text-eucalypt-700",
  ready: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
};

const priorityTone: Record<string, string> = {
  low: "bg-canvas-soft text-ink-faint",
  medium: "bg-eucalypt-50 text-eucalypt-600",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-clay-100 text-clay-600",
};

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const meta = statusMeta[status];
  return <Badge className={statusTone[meta.tone]}>{meta.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = priorityMeta[priority];
  return <Badge className={priorityTone[meta.tone]}>{meta.label}</Badge>;
}

export function CategoryBadge({ category }: { category: Category }) {
  const meta = categoryMeta[category];
  return (
    <Badge className="bg-canvas-soft text-ink-soft">
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}

/** A small pill that marks a value as inferred by Bo (not user-provided). */
export function InferredTag({ label = "inferred" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-eucalypt-50 px-1.5 py-0.5 text-[10px] font-medium text-eucalypt-600"
      title="Bo inferred this — tap to confirm or change it."
    >
      <span aria-hidden>✦</span>
      {label}
    </span>
  );
}
