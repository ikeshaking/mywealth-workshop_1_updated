import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Live-mode account creation. Only reachable when Supabase is configured.
 * The PY manager (verified via their session + profile role) invites a
 * candidate/supervisor here: the service-role key (server-only) sends Supabase's
 * invite email, then a matching profile + blank program_state row is inserted.
 * The recipient sets their own password via the link (see /set-password).
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

  // 3) Invite the user by email. Supabase sends its invite email; the recipient
  //    clicks the link, lands on /set-password, and chooses their own password.
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${origin}/set-password`,
  });
  if (inviteErr || !invited.user) {
    return NextResponse.json(
      { error: inviteErr?.message ?? "Could not send the invite email." },
      { status: 400 },
    );
  }
  const newId = invited.user.id;

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
    invited: true,
  });
}
