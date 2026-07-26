"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "@/lib/py/session";
import { Topbar } from "@/components/shell/Topbar";
import { Dashboard } from "@/components/shell/Dashboard";
import { AdminPanel } from "@/components/shell/AdminPanel";
import { TrackerFrame } from "@/components/shell/TrackerFrame";

type View =
  | { kind: "home" }
  | { kind: "admin" }
  | { kind: "tracker"; candidateId: string; candidateName: string; hash?: string };

function AppInner() {
  const { profile, loading } = useSession();
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "home" });

  useEffect(() => {
    if (!loading && !profile) router.replace("/login");
  }, [profile, loading, router]);

  if (loading || !profile) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  // --- Candidate: straight into their own Professional Year. ---
  if (profile.role === "candidate") {
    return (
      <>
        <Topbar />
        <TrackerFrame candidateId={profile.id} viewerRole="candidate" candidateName={profile.fullName} />
      </>
    );
  }

  // --- Supervisor & PY manager: dashboard, tracker, (manager) admin. ---
  const openCandidate = (candidateId: string, candidateName: string, hash?: string) =>
    setView({ kind: "tracker", candidateId, candidateName, hash });

  if (view.kind === "tracker") {
    return (
      <>
        <Topbar backLabel="All candidates" onBack={() => setView({ kind: "home" })} onHome={() => setView({ kind: "home" })} />
        <div className="tracker-head" style={{ padding: "10px 24px 0", maxWidth: 1400, margin: "0 auto" }}>
          <h2 style={{ fontSize: 18 }}>{view.candidateName}</h2>
          <p className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
            {profile.role === "py_manager" ? "PY manager view" : "Supervisor view"} · changes save live
          </p>
        </div>
        <TrackerFrame
          candidateId={view.candidateId}
          viewerRole={profile.role}
          candidateName={view.candidateName}
          initialHash={view.hash}
        />
      </>
    );
  }

  if (view.kind === "admin") {
    return (
      <>
        <Topbar backLabel="Dashboard" onBack={() => setView({ kind: "home" })} onHome={() => setView({ kind: "home" })} />
        <div className="app-main" style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
          <h1 style={{ marginBottom: 4 }}>Manage accounts</h1>
          <p className="muted" style={{ marginBottom: 22 }}>
            Create candidate and supervisor logins and assign candidates to supervisors.
          </p>
          <AdminPanel />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar />
      {profile.role === "py_manager" ? (
        <div className="app-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px 0", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => setView({ kind: "admin" })}>
            ⚙ Manage accounts
          </button>
        </div>
      ) : null}
      <Dashboard profile={profile} onOpenCandidate={openCandidate} />
    </>
  );
}

export default function AppPage() {
  return (
    <SessionProvider>
      <AppInner />
    </SessionProvider>
  );
}
