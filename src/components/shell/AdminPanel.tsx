"use client";

import { useEffect, useState } from "react";
import { getBackend } from "@/lib/py/backend";
import { isDemoMode } from "@/lib/config";
import { DEMO_PASSWORD } from "@/lib/py/demoSeed";
import { ROLE_LABEL, type Profile, type Role } from "@/lib/py/types";

export function AdminPanel({ onChanged }: { onChanged?: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [role, setRole] = useState<Role>("candidate");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [supervisorId, setSupervisorId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setProfiles(await getBackend().listProfiles());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load accounts.");
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  const supervisors = profiles.filter((p) => p.role === "supervisor");
  const candidates = profiles.filter((p) => p.role === "candidate");

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!fullName.trim() || !email.trim()) {
      setErr("Name and email are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await getBackend().createAccount({
        role,
        fullName,
        email,
        supervisorId: role === "candidate" ? supervisorId || null : null,
      });
      const pw = isDemoMode ? DEMO_PASSWORD : (res as unknown as { tempPassword?: string }).tempPassword;
      setMsg(
        `Created ${res.fullName} (${ROLE_LABEL[res.role]}).` +
          (isDemoMode
            ? ` They can sign in with password “${DEMO_PASSWORD}”.`
            : pw
              ? ` Temporary password: ${pw}`
              : ""),
      );
      setFullName("");
      setEmail("");
      setSupervisorId("");
      await refresh();
      onChanged?.();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed to create account.");
    } finally {
      setBusy(false);
    }
  }

  async function reassign(candidateId: string, newSup: string) {
    try {
      await getBackend().assignSupervisor(candidateId, newSup || null);
      await refresh();
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to reassign.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr)", maxWidth: 960 }}>
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Add an account</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Create a candidate or supervisor login and assign candidates to their supervisor.
        </p>
        <form onSubmit={createAccount} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            <div>
              <label className="label">Role</label>
              <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="candidate">Candidate</option>
                <option value="supervisor">Supervisor</option>
                <option value="py_manager">PY Manager</option>
              </select>
            </div>
            <div>
              <label className="label">Full name</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jordan Lee" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@firm.com" />
            </div>
            {role === "candidate" ? (
              <div>
                <label className="label">Supervisor</label>
                <select className="select" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div>
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>
          {msg ? (
            <div className="badge badge-green" style={{ padding: "8px 12px", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: 12.5 }}>
              {msg}
            </div>
          ) : null}
          {err ? (
            <div className="badge badge-coral" style={{ padding: "8px 12px", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: 12.5 }}>
              {err}
            </div>
          ) : null}
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Supervisors ({supervisors.length})</h2>
        <div className="divide-soft">
          {supervisors.map((s) => (
            <div key={s.id} style={{ padding: "10px 0", display: "flex", gap: 10, alignItems: "center" }}>
              <span className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                {s.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{s.fullName}</div>
                <div className="muted" style={{ fontSize: 12 }}>{s.email}</div>
              </div>
              <span className="badge badge-muted">
                {candidates.filter((c) => c.supervisorId === s.id).length} candidates
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Candidates ({candidates.length})</h2>
        <div className="divide-soft">
          {candidates.map((c) => (
            <div key={c.id} style={{ padding: "10px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                {c.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700 }}>{c.fullName}</div>
                <div className="muted" style={{ fontSize: 12 }}>{c.email}</div>
              </div>
              <div>
                <label className="label" style={{ marginBottom: 3 }}>Supervisor</label>
                <select
                  className="select"
                  style={{ width: 200 }}
                  value={c.supervisorId ?? ""}
                  onChange={(e) => reassign(c.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
