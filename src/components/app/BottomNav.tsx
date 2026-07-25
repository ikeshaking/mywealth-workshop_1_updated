"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, ShoppingBag, CheckCircle2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/capture", label: "Chat", icon: MessageCircle },
  { href: "/decisions", label: "Decisions", icon: ShoppingBag },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav({ approvalsCount = 0 }: { approvalsCount?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 border-t border-black/[0.05] bg-canvas/90 backdrop-blur"
    >
      <ul className="container-app flex items-stretch justify-between py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-eucalypt-700" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
                {href === "/approvals" && approvalsCount > 0 && (
                  <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-semibold text-white">
                    {approvalsCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
