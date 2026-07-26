"use client";

import { useEffect, useState } from "react";
import { getBackend } from "@/lib/py/backend";
import { SessionProvider, useSession } from "@/lib/py/session";
import { ComplianceReport } from "@/components/shell/ComplianceReport";
import type { ProgramState } from "@/lib/py/types";

/**
 * Print-ready compliance export for one candidate — the document a licensee
 * files as evidence of the Professional Year. Deliberately its own route with no
 * app chrome, so Ctrl/Cmd-P produces a clean PDF.
 *
 * Access is the same as everywhere else: the backend refuses to return a record
 * the signed-in user isn't allowed to see (and in live mode RLS enforces it
 * server-side), so a candidate can only ever export their own.
 */
function ExportInner({ candidateId }: { candidateId: string }) {
  const { profile, loading } = useSession();
  const [state, setState] = useState<ProgramState | null>(null);
  const [names, setNames] = useState<{ candidate: string; supervisor: string }>({
    candidate: "",
    supervisor: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      setError("Please sign in to export this record.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const backend = getBackend();
        const [record, profiles] = await Promise.all([
          backend.getRecord(candidateId),
          backend.listProfiles(),
        ]);
        if (cancelled) return;
        const cand = profiles.find((p) => p.id === candidateId);
        const sup = profiles.find((p) => p.id === cand?.supervisorId);
        setNames({ candidate: cand?.fullName ?? "", supervisor: sup?.fullName ?? "" });
        setState((record?.state ?? {}) as ProgramState);
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this record.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId, profile, loading]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "var(--bf)" }}>
        <h1 style={{ fontSize: 20 }}>Can’t export this record</h1>
        <p className="muted" style={{ marginTop: 8 }}>{error}</p>
        <a className="btn btn-ghost" href="/app" style={{ marginTop: 16, display: "inline-flex" }}>
          Back to the app
        </a>
      </div>
    );
  }

  if (!ready || !state) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <span className="muted">Preparing the record…</span>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar — hidden when printing. */}
      <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 20px", background: "var(--chrome)", position: "sticky", top: 0, zIndex: 10, flexWrap: "wrap" }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, flex: 1, minWidth: 160 }}>
          {names.candidate} — Professional Year record
        </span>
        <button className="chrome-btn" onClick={() => window.print()}>🖨 Save as PDF</button>
        <a className="chrome-btn" href="/app">Back</a>
      </div>
      <ComplianceReport
        state={state as Record<string, unknown>}
        candidateName={names.candidate}
        supervisorName={names.supervisor}
        generatedAt={new Date().toISOString()}
      />
      <style>{`@media print { .no-print { display: none !important } }`}</style>
    </>
  );
}

export default function ExportPage({ params }: { params: { candidateId: string } }) {
  return (
    <SessionProvider>
      <ExportInner candidateId={params.candidateId} />
    </SessionProvider>
  );
}
