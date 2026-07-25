"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { THEME_KEY } from "../config";
import { getBackend } from "./backend";
import type { Profile } from "./types";

interface SessionValue {
  profile: Profile | null;
  loading: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const backend = useMemo(() => getBackend(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const refresh = useCallback(async () => {
    try {
      const p = await backend.getCurrentProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    // Sync theme from the value the pre-paint script already applied.
    try {
      const t = (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light";
      setTheme(t);
      document.documentElement.setAttribute("data-theme", t);
    } catch {
      /* ignore */
    }
    refresh();
  }, [refresh]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const p = await backend.signIn(email, password);
      setProfile(p);
      return p;
    },
    [backend],
  );

  const signOut = useCallback(async () => {
    await backend.signOut();
    setProfile(null);
  }, [backend]);

  const value: SessionValue = {
    profile,
    loading,
    theme,
    toggleTheme,
    signIn,
    signOut,
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used within <SessionProvider>");
  return v;
}
