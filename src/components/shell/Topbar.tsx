"use client";

import { useSession } from "@/lib/py/session";
import { ROLE_LABEL } from "@/lib/py/types";
import { Brand } from "./Brand";

export function Topbar({
  onHome,
  backLabel,
  onBack,
}: {
  onHome?: () => void;
  backLabel?: string;
  onBack?: () => void;
}) {
  const { profile, theme, toggleTheme, signOut } = useSession();
  return (
    <header className="app-topbar">
      <div style={{ cursor: onHome ? "pointer" : "default" }} onClick={onHome}>
        <Brand tool="Professional Year Program" />
      </div>
      <div style={{ flex: 1 }} />
      {backLabel && onBack ? (
        <button className="chrome-btn" onClick={onBack}>
          ← {backLabel}
        </button>
      ) : null}
      {profile ? (
        <span
          className="badge"
          style={{
            background: "rgba(255,255,255,.12)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.2)",
          }}
        >
          {ROLE_LABEL[profile.role]}
        </span>
      ) : null}
      {profile ? (
        <span style={{ color: "rgba(255,255,255,.85)", fontSize: 13, fontWeight: 600 }}>
          {profile.fullName}
        </span>
      ) : null}
      <button
        className="chrome-btn icon"
        onClick={toggleTheme}
        title="Toggle light / dark"
        aria-label="Toggle light or dark theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      {profile ? (
        <button className="chrome-btn" onClick={() => void signOut()}>
          Sign out
        </button>
      ) : null}
    </header>
  );
}
