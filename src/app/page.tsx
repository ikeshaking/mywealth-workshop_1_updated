"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "@/lib/py/session";

function Redirector() {
  const { profile, loading } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    router.replace(profile ? "/app" : "/login");
  }, [profile, loading, router]);
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
      <span className="muted">Loading…</span>
    </div>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <Redirector />
    </SessionProvider>
  );
}
