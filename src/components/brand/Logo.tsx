import { cn } from "@/lib/utils";

/** Mabel's friendly blob avatar — calm, warm, a little bit alive. */
export function MabelAvatar({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={size} height={size} role="img">
        <defs>
          <linearGradient id="mabelBlob" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bfb0e2" />
            <stop offset="100%" stopColor="#8468bd" />
          </linearGradient>
        </defs>
        <path
          d="M20 3c8 0 15 6 15 15 0 9-6 19-15 19S5 27 5 18C5 9 12 3 20 3Z"
          fill="url(#mabelBlob)"
        />
        <circle cx="15" cy="19" r="2.1" fill="#fff" />
        <circle cx="25" cy="19" r="2.1" fill="#fff" />
        <path
          d="M15.5 25c1.4 1.6 7.6 1.6 9 0"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <MabelAvatar size={32} />
      <span className="text-xl font-semibold tracking-tight text-ink">Mabel</span>
    </span>
  );
}
