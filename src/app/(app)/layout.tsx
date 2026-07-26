"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BoProvider, useBo } from "@/lib/store/BoProvider";
import { BottomNav } from "@/components/app/BottomNav";
import { getCurrentSession } from "@/lib/session";
import { NudgeToaster } from "@/components/app/NudgeToaster";

/**
 * Authenticated app shell. Wraps every in-app screen with the Nook store,
 * enforces the demo auth guard (redirect to /login when signed out), runs the
 * app-level nudge simulation, and renders the persistent bottom navigation.
 */
function Guarded({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const { ready } = useBo();

  useEffect(() => {
    let cancelled = false;
    getCurrentSession().then((session) => {
      if (cancelled) return;
      if (!session) router.replace("/login");
      else setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked || !ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-faint">
        <span className="animate-pulse-soft">Loading your briefing…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main id="main" className="flex-1 pb-4">
        {children}
      </main>
      <NudgeToaster />
      <BottomNav />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BoProvider>
      <Guarded>{children}</Guarded>
    </BoProvider>
  );
}
