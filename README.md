# MyWealth Solutions — Professional Year Program

A multi-user web app version of the MyWealth Solutions **Professional Year (PY)
Program** tracker. It keeps the exact branding, fonts and content of the original
single-file tool, and wraps it in real logins with three roles:

| Role | What they see |
| --- | --- |
| **Candidate** | Only their own Professional Year. They log hours, notes, evidence and self-assessments. |
| **Supervisor** | Only *their* candidates. They open any of them to review progress and sign off milestones & competencies. |
| **PY Manager** | Everyone — every supervisor and every candidate — plus an admin panel to create accounts and assign candidates to supervisors. |

Role-based visibility is enforced in the data layer (Row-Level Security in live
mode), so a candidate can never load another candidate's record.

---

## Quick start (demo mode — zero config)

```bash
npm install
npm run dev
# open http://localhost:3000
```

On the login screen, tap any **demo account** (password `mywealth`):

- **Priya Anand** — `priya@mywealth.demo` — PY Manager
- **Sarah Nguyen** — `sarah@mywealth.demo` — Supervisor (candidates: Alex, Jordan)
- **David Chen** — `david@mywealth.demo` — Supervisor (candidates: Sam, Riya)
- **Alex Taylor** — `alex@mywealth.demo` — Candidate
- …and Jordan, Sam, Riya.

No environment variables are required. In demo mode all data lives in **this
browser** (localStorage) — it's for previewing the app, not for real cross-device
use.

---

## How it's built

- **App shell** (`src/app`, `src/components/shell`) — a Next.js 14 app in the
  MyWealth brand: login, role-aware dashboards, a candidate switcher for
  supervisors/manager, and the manager admin panel.
- **The tracker** (`public/py-app.html`) — the original PY Program, preserved
  verbatim, embedded per candidate. Its persistence is rewired: instead of this
  browser's localStorage, it posts each save up to the shell, which stores it
  against that one candidate (scoped by the signed-in user's role).
- **Data layer** (`src/lib/py`) — one `PyBackend` interface with two
  implementations: a demo backend (in-browser) and a Supabase backend (live).

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full tour.

---

## Going live (real logins + cross-device real-time sync)

Demo mode is single-device. To get real accounts and **live sync** — a candidate
saves on their laptop and their supervisor + the PY manager see it update on their
own devices, instantly — connect Supabase:

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough
   to start; ~$25/mo Pro for always-on production use).
2. Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in
   the SQL editor. It creates the `profiles` and `program_state` tables and the
   Row-Level Security policies that enforce the three roles.
3. Copy `.env.example` → `.env.local`, set `NEXT_PUBLIC_DEMO_MODE=false`, and fill
   in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` (server-only — used so the PY manager can create
   logins).
4. Create the PY manager's login (Supabase dashboard → Authentication) and a
   matching `profiles` row with `role = 'py_manager'`. From then on the manager
   creates everyone else in-app — each new candidate/supervisor gets a **Supabase
   invite email** and sets their own password at `/set-password`.
5. In Supabase → Authentication → URL Configuration, set your Site URL and add
   `<your-url>/set-password` as a redirect URL so invite links land correctly.
6. Restart the dev server (or redeploy).

Realtime is respected by RLS, so each device only ever receives the rows it's
allowed to see.

---

## Scripts

```bash
npm run dev         # start the dev server
npm run build       # production build
npm run start       # run the production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest unit tests (progress calc + role access)
npm run verify      # lint + typecheck + test + build
```

---

## Security notes

- **Record-level access** is the security boundary: candidates only ever load
  their own record; supervisors only their candidates'; the manager all. In live
  mode this is enforced by Postgres RLS, not just the UI.
- The Supabase **service-role key is server-only** (used solely by the admin
  account-creation route) and is never sent to the browser.
- The embedded tracker's in-app "who is using this" toggle is removed when
  embedded — the role comes from the authenticated session, so a candidate can't
  switch themselves into the supervisor view.
