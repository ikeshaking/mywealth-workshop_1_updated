"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MabelProvider, useMabel } from "@/lib/store/MabelProvider";
import { BottomNav } from "@/components/app/BottomNav";
import { getSession } from "@/lib/auth";
import { NudgeToaster } from "@/components/app/NudgeToaster";

/**
 * Authenticated app shell. Wraps every in-app screen with the Mabel store,
 * enforces the demo auth guard (redirect to /login when signed out), runs the
 * app-level nudge simulation, and renders the persistent bottom navigation.
 */
function Guarded({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const { data, ready } = useMabel();

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked || !ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-faint">
        <span className="animate-pulse-soft">Loading your briefing…</span>
      </div>
    );
  }

  const pendingApprovals = data.approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main id="main" className="flex-1 pb-4">
        {children}
      </main>
      <NudgeToaster />
      <BottomNav approvalsCount={pendingApprovals} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MabelProvider>
      <Guarded>{children}</Guarded>
    </MabelProvider>
  );
}
