"use client";

import { useEffect, useRef, useState } from "react";
import { getBackend } from "@/lib/py/backend";
import type { ProgramState, Role } from "@/lib/py/types";

let _templateCache: string | null = null;
async function loadTemplate(): Promise<string> {
  if (_templateCache) return _templateCache;
  const res = await fetch("/py-app.html", { cache: "force-cache" });
  _templateCache = await res.text();
  return _templateCache;
}

/** Build the iframe document with the candidate's state + locked role injected. */
function buildSrcDoc(template: string, state: ProgramState, inAppRole: "candidate" | "supervisor") {
  const safeState = JSON.stringify(state).replace(/</g, "\\u003c");
  const boot = `<script id="pyBoot">window.__PY_EMBED__=true;window.__PY_STATE__=${safeState};window.__PY_ROLE__=${JSON.stringify(
    inAppRole,
  )};(function(){var e=document.getElementById('pyBoot');if(e&&e.parentNode)e.parentNode.removeChild(e);})();<\/script>`;
  return template.replace("<!--PY_BOOT_INJECT-->", boot);
}

export function TrackerFrame({
  candidateId,
  viewerRole,
  candidateName,
}: {
  candidateId: string;
  viewerRole: Role;
  candidateName: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestState = useRef<ProgramState | null>(null);

  // Candidates edit in candidate view; supervisors and the manager use the
  // supervisor view (sign-off + oversight).
  const inAppRole: "candidate" | "supervisor" = viewerRole === "candidate" ? "candidate" : "supervisor";

  useEffect(() => {
    let cancelled = false;
    setSrcDoc(null);
    setError(null);
    (async () => {
      try {
        const backend = getBackend();
        const [template, record] = await Promise.all([loadTemplate(), backend.getRecord(candidateId)]);
        if (cancelled) return;
        const state = (record?.state ?? {}) as ProgramState;
        setSrcDoc(buildSrcDoc(template, state, inAppRole));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this record.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId, inAppRole]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      // Only accept messages from our own iframe.
      if (iframeRef.current && ev.source !== iframeRef.current.contentWindow) return;
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "py:save") {
        latestState.current = data.state as ProgramState;
        setSaveState("saving");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          try {
            await getBackend().saveRecord(candidateId, latestState.current as ProgramState);
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 1400);
          } catch (e) {
            setSaveState("error");
            setError(e instanceof Error ? e.message : "Save failed.");
          }
        }, 600);
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [candidateId]);

  if (error) {
    return (
      <div className="card" style={{ margin: 24, borderColor: "var(--red)" }}>
        <h3 style={{ color: "var(--red)" }}>Couldn’t open {candidateName}’s record</h3>
        <p className="muted" style={{ marginTop: 8 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "calc(100vh - 53px)" }}>
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 16,
          zIndex: 5,
          fontSize: 12,
          fontWeight: 700,
          padding: "4px 10px",
          borderRadius: 999,
          pointerEvents: "none",
          background:
            saveState === "error"
              ? "var(--red-light)"
              : saveState === "saved"
                ? "var(--green-light)"
                : "var(--surface-2)",
          color:
            saveState === "error"
              ? "var(--red)"
              : saveState === "saved"
                ? "var(--green-dark)"
                : "var(--text-muted)",
          opacity: saveState === "idle" ? 0 : 1,
          transition: "opacity .2s",
        }}
      >
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : saveState === "error" ? "Save failed" : ""}
      </div>
      {!srcDoc ? (
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          <span className="muted">Loading {candidateName}’s Professional Year…</span>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          title={`${candidateName} — Professional Year`}
          srcDoc={srcDoc}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
      )}
    </div>
  );
}
