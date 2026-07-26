"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "@/lib/py/session";
import { Topbar } from "@/components/shell/Topbar";
import { Dashboard } from "@/components/shell/Dashboard";
import { AdminPanel } from "@/components/shell/AdminPanel";
import { TrackerFrame } from "@/components/shell/TrackerFrame";
import { NotificationSettings } from "@/components/shell/NotificationSettings";
import type { FocusTarget } from "@/lib/py/actions";

type View =
  | { kind: "home" }
  | { kind: "admin" }
  | { kind: "notifications" }
  | { kind: "tracker"; candidateId: string; candidateName: string; hash?: string; focus?: FocusTarget };

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
  if (profile.role === "candidate" && view.kind === "notifications") {
    return (
      <>
        <Topbar backLabel="Back" onBack={() => setView({ kind: "home" })} />
        <div className="app-main" style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
          <NotificationSettings userId={profile.id} role={profile.role} />
        </div>
      </>
    );
  }

  if (profile.role === "candidate") {
    return (
      <>
        <Topbar
          extra={
            <>
            <button
              className="chrome-btn"
              onClick={() => setView({ kind: "notifications" })}
              title="Email notification settings"
            >
              🔔<span className="hide-sm" style={{ marginLeft: 5 }}>Notifications</span>
            </button>
            <a
              className="chrome-btn"
              href={`/export/${profile.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Print-ready record of your Professional Year"
            >
              📄<span className="hide-sm" style={{ marginLeft: 5 }}>Export</span>
            </a>
            </>
          }
        />
        <TrackerFrame candidateId={profile.id} viewerRole="candidate" candidateName={profile.fullName} />
      </>
    );
  }

  // --- Supervisor & PY manager: dashboard, tracker, (manager) admin. ---
  const openCandidate = (
    candidateId: string,
    candidateName: string,
    hash?: string,
    focus?: FocusTarget,
  ) => setView({ kind: "tracker", candidateId, candidateName, hash, focus });

  if (view.kind === "tracker") {
    return (
      <>
        <Topbar backLabel="All candidates" onBack={() => setView({ kind: "home" })} onHome={() => setView({ kind: "home" })} />
        <div
          className="tracker-head"
          style={{ padding: "10px 24px 0", maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
        >
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 style={{ fontSize: 18 }}>{view.candidateName}</h2>
            <p className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
              {profile.role === "py_manager" ? "PY manager view" : "Supervisor view"} · changes save live
            </p>
          </div>
          <a
            className="btn btn-ghost"
            href={`/export/${view.candidateId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open a print-ready record of this candidate's Professional Year"
          >
            📄 Export record
          </a>
        </div>
        <TrackerFrame
          candidateId={view.candidateId}
          viewerRole={profile.role}
          candidateName={view.candidateName}
          initialHash={view.hash}
          focus={view.focus}
        />
      </>
    );
  }

  if (view.kind === "notifications") {
    return (
      <>
        <Topbar backLabel="Dashboard" onBack={() => setView({ kind: "home" })} onHome={() => setView({ kind: "home" })} />
        <div className="app-main" style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
          <NotificationSettings userId={profile.id} role={profile.role} />
        </div>
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
      <div className="app-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px 0", display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => setView({ kind: "notifications" })}>
          🔔 Notifications
        </button>
        {profile.role === "py_manager" ? (
          <button className="btn btn-ghost" onClick={() => setView({ kind: "admin" })}>
            ⚙ Manage accounts
          </button>
        ) : null}
      </div>
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
