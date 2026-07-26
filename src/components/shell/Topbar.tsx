"use client";

import { useSession } from "@/lib/py/session";
import { ROLE_LABEL } from "@/lib/py/types";
import { Brand } from "./Brand";

export function Topbar({
  onHome,
  backLabel,
  onBack,
  extra,
}: {
  onHome?: () => void;
  backLabel?: string;
  onBack?: () => void;
  /** Optional action rendered next to the theme/sign-out controls. */
  extra?: React.ReactNode;
}) {
  const { profile, theme, toggleTheme, signOut } = useSession();
  return (
    <header className="app-topbar">
      <div style={{ cursor: onHome ? "pointer" : "default" }} onClick={onHome}>
        <Brand tool="Professional Year Program" />
      </div>
      <div style={{ flex: 1 }} />
      {backLabel && onBack ? (
        <button className="chrome-btn" onClick={onBack} aria-label={`Back to ${backLabel}`}>
          ←<span className="hide-sm" style={{ marginLeft: 5 }}>{backLabel}</span>
        </button>
      ) : null}
      {profile ? (
        <span
          className="badge hide-sm"
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
        <span
          className="hide-sm"
          style={{ color: "rgba(255,255,255,.85)", fontSize: 13, fontWeight: 600 }}
        >
          {profile.fullName}
        </span>
      ) : null}
      {extra}
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
