"use client";

import type { CandidateSummary } from "@/lib/py/types";
import type { RiskFlag } from "@/lib/py/risk";
import { formatDateTime } from "@/lib/utils";

const RISK_BADGE: Record<string, string> = {
  high: "badge-coral",
  medium: "badge-amber",
  low: "badge-muted",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function CandidateCard({
  summary,
  onOpen,
  showSupervisor,
  risks,
}: {
  summary: CandidateSummary;
  onOpen: () => void;
  showSupervisor?: boolean;
  risks?: RiskFlag[];
}) {
  const { profile, progress, supervisorName, updatedAt } = summary;
  return (
    <button
      onClick={onOpen}
      className="card card-tight"
      style={{ textAlign: "left", cursor: "pointer", display: "block", width: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="avatar">{initials(profile.fullName)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {profile.fullName}
          </h3>
          <div className="muted" style={{ fontSize: 12 }}>
            {showSupervisor ? `Supervisor: ${supervisorName}` : profile.email}
          </div>
        </div>
        <span className={`badge ${progress.examPassed ? "badge-green" : "badge-muted"}`}>
          {progress.examPassed ? "Exam ✓" : "Exam pending"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
        <div className="track" style={{ flex: 1 }}>
          <i style={{ width: `${progress.overall}%` }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 13, color: "var(--blue)" }}>{progress.overall}%</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 12,
          fontSize: 12,
          color: "var(--text-muted)",
          flexWrap: "wrap",
        }}
      >
        <span>
          <b style={{ color: "var(--text-dim)" }}>Q{progress.currentQuarter}</b> current
        </span>
        <span>
          <b style={{ color: "var(--text-dim)" }}>
            {progress.milestonesDone}/{progress.milestonesTotal}
          </b>{" "}
          milestones
        </span>
        <span>
          <b style={{ color: "var(--text-dim)" }}>{progress.workHours}</b> work hrs
        </span>
        <span>
          <b style={{ color: "var(--text-dim)" }}>{progress.structuredHours}</b> structured hrs
        </span>
      </div>
      {risks && risks.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          {risks.map((r) => (
            <span
              key={r.code}
              className={`badge ${RISK_BADGE[r.severity] ?? "badge-muted"}`}
              title={r.detail}
            >
              {r.label}
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-faint)" }}>
        Updated {formatDateTime(updatedAt)}
      </div>
    </button>
  );
}
