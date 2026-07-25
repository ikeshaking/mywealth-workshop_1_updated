import { describe, it, expect, beforeEach } from "vitest";
import { getSession, signIn, signOut } from "@/lib/auth";
import { buildSeed } from "@/lib/demo/seed";

describe("auth guards (demo session)", () => {
  beforeEach(() => localStorage.clear());

  it("has no session before signing in (guard would redirect to /login)", () => {
    expect(getSession()).toBeNull();
  });

  it("creates a session on sign in and clears it on sign out", () => {
    const s = signIn("alex@example.com", "Alex");
    expect(s.email).toBe("alex@example.com");
    expect(getSession()?.name).toBe("Alex");
    signOut();
    expect(getSession()).toBeNull();
  });

  it("derives a name from the email when none is given", () => {
    signIn("sam@example.com");
    expect(getSession()?.name).toBe("sam");
  });
});

describe("row-level data access assumptions", () => {
  // The Supabase RLS policy is `auth.uid() = user_id`. This test encodes the
  // invariant that the app relies on: every user-owned record carries the same
  // owner id, so a policy scoped to the signed-in user returns exactly that set.
  it("every seeded item belongs to the single demo user", () => {
    const data = buildSeed("2026-07-25");
    const owner = data.user.id;
    expect(data.items.every((i) => i.user_id === owner)).toBe(true);
    expect(data.conversations.every((c) => c.user_id === owner)).toBe(true);
  });

  it("cross-user reads would be empty (no foreign ids present)", () => {
    const data = buildSeed("2026-07-25");
    const otherUser = "attacker-uid";
    const visibleToAttacker = data.items.filter((i) => i.user_id === otherUser);
    expect(visibleToAttacker).toHaveLength(0);
  });
});
