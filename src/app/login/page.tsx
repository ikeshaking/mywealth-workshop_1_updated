"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "@/lib/py/session";
import { isDemoMode } from "@/lib/config";
import { DEMO_PASSWORD } from "@/lib/py/demoSeed";
import { Brand } from "@/components/shell/Brand";

const DEMO_ACCOUNTS = [
  { email: "priya@mywealth.demo", label: "Priya Anand", role: "PY Manager" },
  { email: "sarah@mywealth.demo", label: "Sarah Nguyen", role: "Supervisor" },
  { email: "david@mywealth.demo", label: "David Chen", role: "Supervisor" },
  { email: "alex@mywealth.demo", label: "Alex Taylor", role: "Candidate" },
  { email: "jordan@mywealth.demo", label: "Jordan Lee", role: "Candidate" },
  { email: "sam@mywealth.demo", label: "Sam Patel", role: "Candidate" },
  { email: "riya@mywealth.demo", label: "Riya Shah", role: "Candidate" },
];

function LoginInner() {
  const { profile, loading, signIn, toggleTheme, theme } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(isDemoMode ? DEMO_PASSWORD : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && profile) router.replace("/app");
  }, [profile, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/app");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Sign in failed.");
      setBusy(false);
    }
  }

  function quick(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0,1fr)", placeItems: "stretch" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          minHeight: "100vh",
        }}
        className="login-grid"
      >
        {/* Brand panel */}
        <div
          style={{
            background: "linear-gradient(135deg,var(--navy) 0%,var(--navy-deep) 100%)",
            color: "#fff",
            padding: "48px 52px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Brand tool="Professional Year Program" />
          <div>
            <h1 style={{ color: "#fff", fontSize: 40, lineHeight: 1.08 }}>
              Your Professional Year, all in one place.
            </h1>
            <p style={{ color: "rgba(255,255,255,.82)", marginTop: 18, maxWidth: 440, fontSize: 15 }}>
              Candidates track their own progress. Supervisors sign off and oversee their
              candidates. The PY manager sees everyone — live.
            </p>
          </div>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>
            MyWealth Solutions · GPS Wealth Ltd (AFSL 254544)
          </div>
        </div>

        {/* Form panel */}
        <div style={{ display: "grid", placeItems: "center", padding: 28, position: "relative" }}>
          <button className="chrome-btn icon" onClick={toggleTheme} style={{ position: "absolute", top: 18, right: 18, background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }} aria-label="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <h2 style={{ fontSize: 24 }}>Sign in</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 22 }}>
              Welcome back. Sign in to your PY account.
            </p>
            <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@mywealth.demo"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {err ? (
                <div className="badge badge-coral" style={{ padding: "8px 12px", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: 12.5 }}>
                  {err}
                </div>
              ) : null}
              <button className="btn btn-primary btn-block" disabled={busy} type="submit">
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {isDemoMode ? (
              <div style={{ marginTop: 24 }}>
                <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>
                  Demo accounts · password “{DEMO_PASSWORD}”
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      onClick={() => quick(a.email)}
                      className="card card-tight"
                      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", textAlign: "left" }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{a.label}</span>
                      <span className="badge badge-muted">{a.role}</span>
                    </button>
                  ))}
                </div>
                <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
                  Tap an account to fill it in, then Sign in. Data is stored in this browser only.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <style>{`@media(max-width:820px){.login-grid{grid-template-columns:1fr!important}.login-grid>div:first-child{padding:32px!important;min-height:auto!important}}`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SessionProvider>
      <LoginInner />
    </SessionProvider>
  );
}
