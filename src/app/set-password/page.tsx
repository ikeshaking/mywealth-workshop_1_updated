"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabase } from "@/lib/config";
import { Brand } from "@/components/shell/Brand";

/**
 * Lands here from a Supabase invite / password-recovery email. Supabase's link
 * carries a one-time token; we establish the session from it, then let the
 * person choose their own password. Live mode only.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "no-session" | "saving" | "done">(
    "checking",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabase) {
      setStatus("no-session");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const sb = createSupabaseBrowserClient();

        // The link may arrive as a PKCE ?code=…, a ?token_hash=…&type=invite,
        // or a #access_token hash the client auto-detects. Handle each.
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const tokenHash = urlParams.get("token_hash");
        const type = urlParams.get("type");
        if (code) {
          await sb.auth.exchangeCodeForSession(code);
        } else if (tokenHash && type) {
          await sb.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "invite" | "recovery" | "signup" | "email",
          });
        }
        const { data } = await sb.auth.getSession();
        if (cancelled) return;
        setStatus(data.session ? "ready" : "no-session");
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Could not verify this link.");
          setStatus("no-session");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Please choose a password of at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Those passwords don’t match.");
      return;
    }
    setStatus("saving");
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const sb = createSupabaseBrowserClient();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setStatus("done");
      setTimeout(() => router.replace("/app"), 900);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not set your password.");
      setStatus("ready");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.1fr 1fr" }} className="login-grid">
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
          <h1 style={{ color: "#fff", fontSize: 36, lineHeight: 1.1 }}>Welcome to your PY account.</h1>
          <p style={{ color: "rgba(255,255,255,.82)", marginTop: 16, maxWidth: 420 }}>
            Choose a password to finish setting up your MyWealth Professional Year login.
          </p>
        </div>
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>MyWealth Solutions · GPS Wealth Ltd (AFSL 254544)</div>
      </div>

      <div style={{ display: "grid", placeItems: "center", padding: 28 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {status === "checking" ? (
            <p className="muted">Verifying your invite…</p>
          ) : status === "no-session" ? (
            <div>
              <h2 style={{ fontSize: 22 }}>This link can’t be used</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                {hasSupabase
                  ? "The invite link is invalid or has expired. Ask your PY manager to send a new invite."
                  : "Password setup is only available once the app is connected to Supabase (live mode)."}
              </p>
              <a className="btn btn-ghost" href="/login" style={{ marginTop: 16, display: "inline-flex" }}>
                Back to sign in
              </a>
            </div>
          ) : status === "done" ? (
            <div>
              <h2 style={{ fontSize: 22 }}>You’re all set ✓</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Taking you to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
              <h2 style={{ fontSize: 22 }}>Choose a password</h2>
              <div>
                <label className="label">New password</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {err ? (
                <div className="badge badge-coral" style={{ padding: "8px 12px", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: 12.5 }}>
                  {err}
                </div>
              ) : null}
              <button className="btn btn-primary btn-block" type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Saving…" : "Set password & sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{`@media(max-width:820px){.login-grid{grid-template-columns:1fr!important}.login-grid>div:first-child{padding:32px!important}}`}</style>
    </div>
  );
}
