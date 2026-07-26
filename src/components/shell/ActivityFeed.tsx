"use client";

import type { Activity } from "@/lib/py/actions";
import { formatDateTime } from "@/lib/utils";

const CAT_BADGE: Record<string, string> = {
  milestone: "badge-blue",
  module: "badge-lime",
  hours: "badge-amber",
  competency: "badge-purple",
  data: "badge-muted",
  general: "badge-muted",
};

/**
 * "Since you were last here" — what candidates changed, newest first, so a
 * reviewer can see at a glance what moved rather than hunting the dashboard.
 */
export function ActivityFeed({
  activity,
  sinceIso,
  onOpen,
}: {
  activity: Activity[];
  sinceIso?: string;
  onOpen: (candidateId: string, candidateName: string) => void;
}) {
  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          borderBottom: activity.length ? "1px solid var(--border-soft)" : "none",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: 18 }}>Recent activity</h2>
        {activity.length > 0 ? <span className="badge badge-blue">{activity.length} new</span> : null}
        <span className="muted" style={{ fontSize: 11.5, marginLeft: "auto" }}>
          {sinceIso ? `Since ${formatDateTime(sinceIso)}` : "Latest updates"}
        </span>
      </div>

      {activity.length === 0 ? (
        <div style={{ padding: "18px 20px" }}>
          <p className="muted" style={{ fontSize: 13.5 }}>
            No candidate activity since you were last here.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", maxHeight: 420, overflowY: "auto" }}>
          {activity.map((a, i) => (
            <li key={a.candidateId + a.ts + i}>
              <button className="activity-row" onClick={() => onOpen(a.candidateId, a.candidateName)}>
                <span className={`badge ${CAT_BADGE[a.cat] ?? "badge-muted"}`}>{a.cat}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>
                    {a.candidateName} · {a.action}
                  </span>
                  {a.detail ? (
                    <span className="muted" style={{ display: "block", fontSize: 12 }}>
                      {a.detail}
                    </span>
                  ) : null}
                </span>
                <span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                  {formatDateTime(a.ts)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
