"use client";

import { totalPending, type Todo } from "@/lib/py/actions";

/**
 * "What needs you" — the reviewer's action list. Each row deep-links straight
 * into the exact place in that candidate's tracker where the action is taken.
 */
export function TodoList({
  todos,
  onOpen,
}: {
  todos: Todo[];
  onOpen: (candidateId: string, candidateName: string, hash: string) => void;
}) {
  const total = todos.reduce((s, t) => s + totalPending(t), 0);

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          borderBottom: todos.length ? "1px solid var(--border-soft)" : "none",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: 18 }}>Needs you</h2>
        {total > 0 ? (
          <span className="badge badge-coral">{total} to action</span>
        ) : (
          <span className="badge badge-green">All clear</span>
        )}
      </div>

      {todos.length === 0 ? (
        <div style={{ padding: "18px 20px" }}>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Nothing waiting on you right now. When a candidate completes a training module or
            self-rates a competency, it’ll appear here to sign off.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none" }}>
          {todos.map((t) => (
            <li key={t.candidateId} className="todo-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14.5 }}>{t.candidateName}</strong>
                  <span className="badge badge-muted">{totalPending(t)} pending</span>
                </div>

                <ul style={{ listStyle: "none", marginTop: 8, display: "grid", gap: 6 }}>
                  {t.signoffModules.slice(0, 3).map((m) => (
                    <li key={m.id}>
                      <button
                        className="todo-item"
                        onClick={() =>
                          onOpen(
                            t.candidateId,
                            t.candidateName,
                            `#/quarters/${m.quarterId}/training`,
                          )
                        }
                      >
                        <span className="badge badge-amber">Sign off</span>
                        <span className="todo-item-text">
                          Q{m.quarterNumber} · {m.title}
                        </span>
                        <span aria-hidden style={{ color: "var(--text-faint)" }}>→</span>
                      </button>
                    </li>
                  ))}
                  {t.signoffModules.length > 3 ? (
                    <li className="muted" style={{ fontSize: 12, paddingLeft: 2 }}>
                      +{t.signoffModules.length - 3} more module
                      {t.signoffModules.length - 3 === 1 ? "" : "s"} to sign off
                    </li>
                  ) : null}

                  {t.competencyPending > 0 ? (
                    <li>
                      <button
                        className="todo-item"
                        onClick={() => onOpen(t.candidateId, t.candidateName, "#/competency")}
                      >
                        <span className="badge badge-purple">Rate</span>
                        <span className="todo-item-text">
                          {t.competencyPending} competenc
                          {t.competencyPending === 1 ? "y" : "ies"} awaiting your rating
                        </span>
                        <span aria-hidden style={{ color: "var(--text-faint)" }}>→</span>
                      </button>
                    </li>
                  ) : null}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
