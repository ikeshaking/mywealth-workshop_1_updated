import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Live-mode account creation. Only reachable when Supabase is configured.
 * The PY manager (verified via their session + profile role) creates a
 * candidate/supervisor login here; the auth user is created with the
 * service-role key (server-only), then a matching profile + blank program_state
 * row is inserted. A temporary password is returned for the manager to relay.
 *
 * In demo mode the client never calls this — accounts are created in-browser.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Live account creation requires SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 501 },
    );
  }

  // 1) Verify the caller is a signed-in PY manager.
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: me } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role !== "py_manager") {
    return NextResponse.json({ error: "Only the PY manager can create accounts." }, { status: 403 });
  }

  // 2) Validate input.
  const body = await req.json().catch(() => null);
  const role = body?.role as string;
  const fullName = String(body?.fullName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const supervisorId = body?.supervisorId ?? null;
  if (!["candidate", "supervisor", "py_manager"].includes(role) || !fullName || !email) {
    return NextResponse.json({ error: "role, fullName and email are required." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 3) Create the auth user with a temporary password.
  const tempPassword = "PY-" + Math.random().toString(36).slice(2, 10) + "!";
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? "Could not create user." }, { status: 400 });
  }
  const newId = created.user.id;

  // 4) Insert profile + (for candidates) a blank program_state row.
  const { error: profErr } = await admin.from("profiles").insert({
    id: newId,
    role,
    full_name: fullName,
    email,
    supervisor_id: role === "candidate" ? supervisorId : null,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(newId).catch(() => {});
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  if (role === "candidate") {
    await admin.from("program_state").insert({
      candidate_id: newId,
      supervisor_id: supervisorId,
      state: {},
    });
  }

  return NextResponse.json({
    profile: {
      id: newId,
      role,
      fullName,
      email,
      supervisorId: role === "candidate" ? supervisorId : null,
      createdAt: new Date().toISOString(),
    },
    tempPassword,
  });
}
