"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { BoAvatar } from "@/components/brand/Logo";

/**
 * Compact top bar. Shows either a back button + title (sub-screens) or Nook's
 * avatar + greeting (top-level screens).
 */
export function AppHeader({
  title,
  back,
  right,
}: {
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.04] bg-canvas/90 backdrop-blur">
      <div className="container-app flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {back ? (
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="-ml-1 rounded-lg p-1.5 text-ink-soft hover:bg-eucalypt-50"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <Link href="/dashboard" aria-label="Nook home">
              <BoAvatar size={32} />
            </Link>
          )}
          {title && <h1 className="truncate text-base font-semibold text-ink">{title}</h1>}
        </div>
        {right ?? (
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded-lg p-1.5 text-ink-soft hover:bg-eucalypt-50"
          >
            <Settings size={20} />
          </Link>
        )}
      </div>
    </header>
  );
}
