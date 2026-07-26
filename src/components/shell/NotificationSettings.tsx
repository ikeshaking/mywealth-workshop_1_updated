"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PREFS, getPrefs, savePrefs, type Prefs } from "@/lib/py/prefs";
import { isDemoMode } from "@/lib/config";
import type { Role } from "@/lib/py/types";

interface Toggle {
  key: keyof Prefs;
  label: string;
  help: string;
  roles: Role[];
}

const TOGGLES: Toggle[] = [
  {
    key: "daily_digest",
    label: "Daily digest",
    help: "One email a day listing what your candidates finished and what's waiting on your sign-off. Only sent when there's something new.",
    roles: ["supervisor", "py_manager"],
  },
  {
    key: "at_risk_alerts",
    label: "At-risk alerts",
    help: "Include candidates tracking behind the program's hour or milestone requirements in your digest.",
    roles: ["supervisor", "py_manager"],
  },
  {
    key: "monthly_summary",
    label: "Monthly summary",
    help: "A summary of the month just gone, sent at the start of each month.",
    roles: ["candidate", "supervisor", "py_manager"],
  },
  {
    key: "nudges",
    label: "Reminders for me",
    help: "A gentle prompt if your own Professional Year stalls — no more than one a week.",
    roles: ["candidate"],
  },
];

export function NotificationSettings({ userId, role }: { userId: string; role: Role }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPrefs(userId)
      .then((p) => {
        if (!cancelled) setPrefs(p);
      })
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Could not load settings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setErr(null);
    try {
      await savePrefs(userId, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    }
  }

  const mine = TOGGLES.filter((t) => t.roles.includes(role));

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18 }}>Email notifications</h2>
        {saved ? <span className="badge badge-green">Saved</span> : null}
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
        Choose what lands in your inbox. Nothing is sent when there's nothing to report.
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="divide-soft">
          {mine.map((t) => (
            <label
              key={t.key}
              style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 0", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={prefs[t.key]}
                onChange={() => void toggle(t.key)}
                style={{ marginTop: 3, width: 17, height: 17, accentColor: "var(--blue)", flex: "none" }}
              />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{t.label}</span>
                <span className="muted" style={{ display: "block", fontSize: 12.5 }}>{t.help}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {err ? (
        <div className="badge badge-coral" style={{ marginTop: 12, padding: "8px 12px", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: 12.5 }}>
          {err}
        </div>
      ) : null}

      {isDemoMode ? (
        <p className="muted" style={{ fontSize: 11.5, marginTop: 16, borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
          Demo mode: preferences are saved in this browser and no email is actually sent. Connect
          Supabase and an email provider to switch real delivery on.
        </p>
      ) : null}
    </div>
  );
}
