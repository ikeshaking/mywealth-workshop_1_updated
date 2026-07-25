export function EmptyState({
  icon = "🌤️",
  title,
  body,
}: {
  icon?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-eucalypt-200 bg-white/60 px-4 py-8 text-center">
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{title}</p>
      {body && <p className="mt-1 text-xs text-ink-soft">{body}</p>}
    </div>
  );
}
