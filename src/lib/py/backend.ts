"use client";

import { DEMO_DB_KEY, DEMO_SESSION_KEY, isDemoMode } from "../config";
import { buildDemoDb, DEMO_PASSWORD, type DemoDb } from "./demoSeed";
import { SupabaseBackend } from "./backendSupabase";
import { newBlankState } from "./state";
import type { Profile, ProgramRecord, ProgramState, Role } from "./types";

export interface CreateAccountInput {
  role: Role;
  fullName: string;
  email: string;
  supervisorId?: string | null;
}

export interface PyBackend {
  signIn(email: string, password: string): Promise<Profile>;
  signOut(): Promise<void>;
  getCurrentProfile(): Promise<Profile | null>;
  /** Profiles the signed-in user may see (scoped by role). */
  listProfiles(): Promise<Profile[]>;
  getRecord(candidateId: string): Promise<ProgramRecord | null>;
  saveRecord(candidateId: string, state: ProgramState): Promise<void>;
  createAccount(input: CreateAccountInput): Promise<Profile>;
  assignSupervisor(candidateId: string, supervisorId: string | null): Promise<void>;
  /** Live realtime updates (Supabase). Returns an unsubscribe fn. No-op in demo. */
  subscribe(onChange: () => void): () => void;
}

/** Can `viewer` see the candidate profile `cand`? Mirrors the RLS policy. */
export function canView(viewer: Profile, cand: Profile): boolean {
  if (viewer.role === "py_manager") return true;
  if (viewer.id === cand.id) return true;
  if (viewer.role === "supervisor") return cand.supervisorId === viewer.id;
  return false;
}

/* ============================================================
   DEMO BACKEND — everything in this browser's localStorage.
============================================================ */
class DemoBackend implements PyBackend {
  private read(): DemoDb {
    if (typeof window === "undefined") return buildDemoDb();
    try {
      const raw = localStorage.getItem(DEMO_DB_KEY);
      if (raw) return JSON.parse(raw) as DemoDb;
    } catch {
      /* fall through to seed */
    }
    const seeded = buildDemoDb();
    this.write(seeded);
    return seeded;
  }

  private write(db: DemoDb) {
    if (typeof window === "undefined") return;
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
  }

  private requireSession(db: DemoDb): Profile {
    const id = typeof window !== "undefined" ? localStorage.getItem(DEMO_SESSION_KEY) : null;
    const p = id ? db.profiles.find((x) => x.id === id) : null;
    if (!p) throw new Error("Not signed in.");
    return p;
  }

  async signIn(email: string, password: string): Promise<Profile> {
    const db = this.read();
    const p = db.profiles.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p) throw new Error("No account found for that email.");
    if (password !== DEMO_PASSWORD) throw new Error("Incorrect password.");
    localStorage.setItem(DEMO_SESSION_KEY, p.id);
    return p;
  }

  async signOut(): Promise<void> {
    if (typeof window !== "undefined") localStorage.removeItem(DEMO_SESSION_KEY);
  }

  async getCurrentProfile(): Promise<Profile | null> {
    if (typeof window === "undefined") return null;
    const id = localStorage.getItem(DEMO_SESSION_KEY);
    if (!id) return null;
    return this.read().profiles.find((x) => x.id === id) ?? null;
  }

  async listProfiles(): Promise<Profile[]> {
    const db = this.read();
    const me = this.requireSession(db);
    if (me.role === "py_manager") return db.profiles;
    if (me.role === "supervisor")
      return db.profiles.filter((p) => p.id === me.id || p.supervisorId === me.id);
    return db.profiles.filter((p) => p.id === me.id);
  }

  async getRecord(candidateId: string): Promise<ProgramRecord | null> {
    const db = this.read();
    const me = this.requireSession(db);
    const cand = db.profiles.find((x) => x.id === candidateId);
    if (!cand) return null;
    if (!canView(me, cand)) throw new Error("You are not permitted to view this candidate.");
    let rec = db.records[candidateId];
    if (!rec) {
      const supName = db.profiles.find((p) => p.id === cand.supervisorId)?.fullName ?? "";
      rec = {
        candidateId,
        supervisorId: cand.supervisorId,
        state: newBlankState({ candidateName: cand.fullName, supervisorName: supName }),
        updatedAt: new Date().toISOString(),
        updatedBy: me.id,
      };
      db.records[candidateId] = rec;
      this.write(db);
    }
    return rec;
  }

  async saveRecord(candidateId: string, state: ProgramState): Promise<void> {
    const db = this.read();
    const me = this.requireSession(db);
    const cand = db.profiles.find((x) => x.id === candidateId);
    if (!cand) throw new Error("Unknown candidate.");
    if (!canView(me, cand)) throw new Error("You are not permitted to edit this candidate.");
    db.records[candidateId] = {
      candidateId,
      supervisorId: cand.supervisorId,
      state,
      updatedAt: new Date().toISOString(),
      updatedBy: me.id,
    };
    this.write(db);
  }

  async createAccount(input: CreateAccountInput): Promise<Profile> {
    const db = this.read();
    const me = this.requireSession(db);
    if (me.role !== "py_manager") throw new Error("Only the PY manager can create accounts.");
    const email = input.email.trim().toLowerCase();
    if (db.profiles.some((p) => p.email.toLowerCase() === email))
      throw new Error("An account with that email already exists.");
    const p: Profile = {
      id: "u-" + Math.random().toString(36).slice(2, 9),
      role: input.role,
      fullName: input.fullName.trim(),
      email,
      supervisorId: input.role === "candidate" ? input.supervisorId ?? null : null,
      createdAt: new Date().toISOString(),
    };
    db.profiles.push(p);
    if (p.role === "candidate") {
      const supName = db.profiles.find((s) => s.id === p.supervisorId)?.fullName ?? "";
      db.records[p.id] = {
        candidateId: p.id,
        supervisorId: p.supervisorId,
        state: newBlankState({ candidateName: p.fullName, supervisorName: supName }),
        updatedAt: new Date().toISOString(),
        updatedBy: me.id,
      };
    }
    this.write(db);
    return p;
  }

  async assignSupervisor(candidateId: string, supervisorId: string | null): Promise<void> {
    const db = this.read();
    const me = this.requireSession(db);
    if (me.role !== "py_manager") throw new Error("Only the PY manager can reassign supervisors.");
    const cand = db.profiles.find((x) => x.id === candidateId);
    if (!cand) throw new Error("Unknown candidate.");
    cand.supervisorId = supervisorId;
    if (db.records[candidateId]) db.records[candidateId].supervisorId = supervisorId;
    this.write(db);
  }

  subscribe(): () => void {
    // Demo is single-device; nothing to subscribe to.
    return () => {};
  }
}

let _demo: DemoBackend | null = null;
let _live: PyBackend | null = null;

/** The active backend for the current runtime (demo unless Supabase is configured). */
export function getBackend(): PyBackend {
  if (isDemoMode) {
    if (!_demo) _demo = new DemoBackend();
    return _demo;
  }
  // Constructed lazily so the Supabase client is only created in live mode.
  if (!_live) _live = new SupabaseBackend();
  return _live;
}

export function resetDemoData() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEMO_DB_KEY);
    localStorage.removeItem(DEMO_SESSION_KEY);
  }
}
