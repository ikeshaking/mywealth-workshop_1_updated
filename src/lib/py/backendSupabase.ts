"use client";

import { createSupabaseBrowserClient } from "../supabase/client";
import type { CreateAccountInput, PyBackend } from "./backend";
import type { Profile, ProgramRecord, ProgramState } from "./types";

type ProfileRow = {
  id: string;
  role: Profile["role"];
  full_name: string;
  email: string;
  supervisor_id: string | null;
  created_at: string;
};

function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    role: r.role,
    fullName: r.full_name,
    email: r.email,
    supervisorId: r.supervisor_id,
    createdAt: r.created_at,
  };
}

/**
 * Live backend: Supabase Auth + Postgres + Realtime. Row-Level Security (see
 * supabase/migrations/0001_init.sql) enforces that candidates only reach their
 * own row, supervisors only their candidates, and the PY manager everything —
 * so the same policy is applied server-side, not just in the UI.
 */
export class SupabaseBackend implements PyBackend {
  private sb = createSupabaseBrowserClient();

  async signIn(email: string, password: string): Promise<Profile> {
    const { error } = await this.sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    const p = await this.getCurrentProfile();
    if (!p) throw new Error("Signed in, but no profile exists for this account yet.");
    return p;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  async getCurrentProfile(): Promise<Profile | null> {
    const { data: userData } = await this.sb.auth.getUser();
    const user = userData.user;
    if (!user) return null;
    const { data, error } = await this.sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProfile(data as ProfileRow) : null;
  }

  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await this.sb.from("profiles").select("*");
    if (error) throw new Error(error.message);
    return (data as ProfileRow[]).map(toProfile);
  }

  async getRecord(candidateId: string): Promise<ProgramRecord | null> {
    const { data, error } = await this.sb
      .from("program_state")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      candidateId: data.candidate_id,
      supervisorId: data.supervisor_id,
      state: data.state as ProgramState,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  }

  async saveRecord(candidateId: string, state: ProgramState): Promise<void> {
    const { data: userData } = await this.sb.auth.getUser();
    const { error } = await this.sb.from("program_state").upsert(
      {
        candidate_id: candidateId,
        state,
        updated_at: new Date().toISOString(),
        updated_by: userData.user?.id ?? null,
      },
      { onConflict: "candidate_id" },
    );
    if (error) throw new Error(error.message);
  }

  async createAccount(input: CreateAccountInput): Promise<Profile> {
    // Creating an auth user needs the service-role key, so it runs on the server.
    const res = await fetch("/api/admin/create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? "Failed to create account.");
    return body.profile as Profile;
  }

  async assignSupervisor(candidateId: string, supervisorId: string | null): Promise<void> {
    const { error } = await this.sb
      .from("profiles")
      .update({ supervisor_id: supervisorId })
      .eq("id", candidateId);
    if (error) throw new Error(error.message);
    await this.sb
      .from("program_state")
      .update({ supervisor_id: supervisorId })
      .eq("candidate_id", candidateId);
  }

  subscribe(onChange: () => void): () => void {
    const channel = this.sb
      .channel("program_state_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "program_state" },
        () => onChange(),
      )
      .subscribe();
    return () => {
      this.sb.removeChannel(channel);
    };
  }
}
