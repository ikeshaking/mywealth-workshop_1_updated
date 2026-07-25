"use client";

import { useCallback, useEffect, useState } from "react";
import { getBackend } from "@/lib/py/backend";
import { loadCandidateSummaries } from "@/lib/py/summaries";
import type { CandidateSummary, Profile } from "@/lib/py/types";
import { CandidateCard } from "./CandidateCard";

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="card card-tight" style={{ minWidth: 120 }}>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--hf)", color: tone ?? "var(--heading)" }}>
        {value}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function Dashboard({
  profile,
  onOpenCandidate,
}: {
  profile: Profile;
  onOpenCandidate: (id: string, name: string) => void;
}) {
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { candidates, supervisors } = await loadCandidateSummaries();
    setCandidates(candidates);
    setSupervisors(supervisors);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    // Live updates: when any candidate saves (from any device), refresh progress.
    const unsub = getBackend().subscribe(() => void refresh());
    return unsub;
  }, [refresh]);

  const isManager = profile.role === "py_manager";
  const avg =
    candidates.length > 0
      ? Math.round(candidates.reduce((s, c) => s + c.progress.overall, 0) / candidates.length)
      : 0;
  const examsPassed = candidates.filter((c) => c.progress.examPassed).length;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <div className="hero" style={{ marginBottom: 20 }}>
        <div className="hero-sub">MyWealth Solutions · Professional Year Program</div>
        <h1 style={{ marginTop: 8 }}>
          {isManager ? "Program overview" : `Your candidates, ${profile.fullName.split(" ")[0]}`}
        </h1>
        <p style={{ color: "rgba(255,255,255,.8)", marginTop: 8, maxWidth: 620 }}>
          {isManager
            ? "Every supervisor and candidate across the program. Open any candidate to see and manage their full Professional Year."
            : "Open a candidate to review their progress, sign off milestones and competencies, and keep their Professional Year on track."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <Stat label="Candidates" value={candidates.length} tone="var(--blue)" />
        {isManager ? <Stat label="Supervisors" value={supervisors.length} /> : null}
        <Stat label="Avg. progress" value={`${avg}%`} tone="var(--blue)" />
        <Stat label="Exams passed" value={`${examsPassed}/${candidates.length}`} tone="var(--green-dark)" />
      </div>

      {loading ? (
        <p className="muted">Loading candidates…</p>
      ) : candidates.length === 0 ? (
        <div className="card">
          <h3>No candidates yet</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            {isManager
              ? "Use “Manage accounts” to create candidate and supervisor logins."
              : "You don’t have any candidates assigned yet. Your PY manager assigns them to you."}
          </p>
        </div>
      ) : isManager ? (
        // Grouped by supervisor for the manager.
        <div style={{ display: "grid", gap: 26 }}>
          {supervisors.map((sup) => {
            const mine = candidates.filter((c) => c.profile.supervisorId === sup.id);
            if (mine.length === 0) return null;
            return (
              <section key={sup.id}>
                <h2 style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  {sup.fullName}
                  <span className="badge badge-muted">{mine.length}</span>
                </h2>
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
                  {mine.map((c) => (
                    <CandidateCard key={c.profile.id} summary={c} onOpen={() => onOpenCandidate(c.profile.id, c.profile.fullName)} />
                  ))}
                </div>
              </section>
            );
          })}
          {(() => {
            const unassigned = candidates.filter(
              (c) => !c.profile.supervisorId || !supervisors.some((s) => s.id === c.profile.supervisorId),
            );
            if (unassigned.length === 0) return null;
            return (
              <section>
                <h2 style={{ marginBottom: 12 }}>Unassigned</h2>
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
                  {unassigned.map((c) => (
                    <CandidateCard key={c.profile.id} summary={c} showSupervisor onOpen={() => onOpenCandidate(c.profile.id, c.profile.fullName)} />
                  ))}
                </div>
              </section>
            );
          })()}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
          {candidates.map((c) => (
            <CandidateCard key={c.profile.id} summary={c} onOpen={() => onOpenCandidate(c.profile.id, c.profile.fullName)} />
          ))}
        </div>
      )}
    </div>
  );
}
