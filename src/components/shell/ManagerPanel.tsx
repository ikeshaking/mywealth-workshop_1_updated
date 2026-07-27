"use client";

import type { FocusTarget } from "@/lib/py/actions";
import { actionableCount, type ManagerAlert, type ManagerAlertKind } from "@/lib/py/manager";

const TONE: Record<string, string> = {
  high: "badge-coral",
  medium: "badge-amber",
  low: "badge-muted",
  info: "badge-blue",
};

const GROUPS: { kind: ManagerAlertKind; heading: string; blurb: string }[] = [
  {
    kind: "supervisor_stalled",
    heading: "Supervisors to chase",
    blurb: "Completed work sitting unsigned.",
  },
  {
    kind: "falling_behind",
    heading: "Candidates off track",
    blurb: "Behind the program’s hour or milestone requirements.",
  },
  {
    kind: "stage_progressed",
    heading: "Recently progressed",
    blurb: "Candidates who moved into a new stage.",
  },
  {
    kind: "checkin_due",
    heading: "Check-ins due this month",
    blurb: "You haven’t opened these Professional Years yet this month.",
  },
];

/**
 * The PY manager's view of what needs them. Deliberately NOT a sign-off list —
 * signing off is the supervisor's job. This is oversight: who's stuck, who's
 * slipping, who's moved on, and who they owe a check-in.
 */
export function ManagerPanel({
  alerts,
  onOpen,
}: {
  alerts: ManagerAlert[];
  onOpen: (candidateId: string, candidateName: string, hash?: string, focus?: FocusTarget) => void;
}) {
  const urgent = actionableCount(alerts);

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          borderBottom: alerts.length ? "1px solid var(--border-soft)" : "none",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: 18 }}>Needs your attention</h2>
        {urgent > 0 ? (
          <span className="badge badge-coral">{urgent} to action</span>
        ) : (
          <span className="badge badge-green">Nothing urgent</span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div style={{ padding: "18px 20px" }}>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Every candidate is on track and every supervisor is up to date. You’ll see anyone
            slipping behind, any sign-off left waiting, and your monthly check-ins here.
          </p>
        </div>
      ) : (
        <div>
          {GROUPS.map((g) => {
            const items = alerts.filter((a) => a.kind === g.kind);
            if (items.length === 0) return null;
            return (
              <div key={g.kind} className="todo-row" style={{ display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14.5 }}>{g.heading}</strong>
                  <span className="badge badge-muted">{items.length}</span>
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{g.blurb}</p>

                <ul style={{ listStyle: "none", marginTop: 8, display: "grid", gap: 6 }}>
                  {items.map((a, i) => (
                    <li key={a.kind + a.candidateId + i}>
                      <button
                        className="todo-item"
                        onClick={() => onOpen(a.candidateId, a.candidateName, a.hash, a.focus)}
                      >
                        <span className={`badge ${TONE[a.severity] ?? "badge-muted"}`}>{a.badge}</span>
                        <span className="todo-item-text stacked">
                          <span style={{ fontWeight: 700 }}>{a.title}</span>
                          <span className="muted" style={{ display: "block", fontSize: 12 }}>
                            {a.detail}
                          </span>
                        </span>
                        <span aria-hidden style={{ color: "var(--text-faint)" }}>→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
