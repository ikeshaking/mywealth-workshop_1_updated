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

## Email notifications & summaries

Once Supabase **and** an email provider are configured, two scheduled jobs run
(declared in [`vercel.json`](vercel.json)):

| Job | When | What it sends |
| --- | --- | --- |
| `/api/cron/daily` | Daily, 20:00 UTC (~6am AEST) | **Daily digest** to each supervisor / PY manager: what became ready to sign off since their last digest, plus any candidate tracking behind. **Candidate nudges** (max one a week) when someone's own PY has stalled. |
| `/api/cron/monthly` | 1st of the month, 00:30 UTC | **Monthly summary** to every candidate, supervisor and manager — last month's progress, highlights and what's outstanding. |

Nothing is ever sent twice: every send records a `dedupe_key` in
`notification_log`, and the unique index on it is what prevents duplicates, so
the jobs are safe to retry. Emails are only sent when there is something to say.

Each person controls their own delivery in-app (🔔 **Notifications**), stored in
`notification_prefs`.

### At-risk detection

`src/lib/py/risk.ts` flags candidates against the program's real requirements —
**1,600 total hours (min 1,500 work + 100 structured) over 12 months**, and the
exam + degree gates before Q3. Flags surface as badges on the dashboard and in
the digest emails: behind pace, structured training low, exam outstanding,
degree unverified, sign-off backlog, no recent activity.

### Compliance export

**📄 Export record** opens a print-ready *Record of Completion* for a candidate —
statutory gates, hours vs the 1,500/100/1,600 requirements, quarter-by-quarter
milestones and module sign-offs, competency ratings, the full audit trail and a
signature block. Ctrl/Cmd-P saves it as a PDF for the licensee file. Candidates
can export their own record; supervisors their candidates'; the manager anyone's.

### Setting email up

1. Create a [Resend](https://resend.com) account, verify your sending domain, and
   set `RESEND_API_KEY` + `EMAIL_FROM`.
2. Set `NEXT_PUBLIC_APP_URL` (links inside emails) and `CRON_SECRET` (protects the
   cron endpoints — they refuse to run in production without it).
3. Run [`supabase/migrations/0002_notifications.sql`](supabase/migrations/0002_notifications.sql).

Until those are set the jobs still run harmlessly: they log what they *would*
have sent and skip delivery, so nothing breaks in demo mode.

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

---

## Staff training: Debt Recycling (CSO induction)

[`public/debt-recycling-training.html`](public/debt-recycling-training.html) is a
standalone, dependency-free interactive training module for **client service
officers** who are new to the debt recycling strategy. It is served as a static
page — open it at `/debt-recycling-training.html`, or just double-click the file.

Twelve modules, about **40 minutes** end to end (each module carries its own
estimate). Modules 1 and 2 start from the ground up — what "tax deductible"
means, what a deduction is worth, what equity and usable equity are, what a term
loan is and why it carries an offset — before any of the strategy is introduced.

Roles are modelled as MyWealth runs them: adviser, **associate adviser** (the
calcs and the debt transfer instructions), mortgage broker, accountant, and the
two client service seats — **implementation** and **review**.

Eight interaction types: multiple choice, select-all, drag-and-drop sorting,
drag-to-sequence, dropdown routing drills, flip-card definitions, a live
deduction calculator, and two clickable diagrams. Ten inline SVG figures, all
themed from the CSS tokens rather than shipped as images. It finishes with a
12-question assessment (80% to pass) and a printable certificate. Progress and
answers persist per browser in `localStorage`.

Content arrives progressively rather than as a wall: blocks fade in as you
scroll, the denser reference sections (the eight rules, the implementation
checklist, the escalation triggers) are expandable rows, and five of the diagrams
animate — money travels the account map, the six-step cycle circulates, and the
bar charts grow. A **Pause** control in the header stops all diagram motion, and
`prefers-reduced-motion` is honoured by default.

It shares the PY tracker's brand tokens and light/dark behaviour but has no
dependency on the app shell, so it can later be wrapped the same way
`py-app.html` is if per-user completion tracking is wanted.

Content is based on My Wealth Solutions' own
[comprehensive guide to debt recycling](https://mywealthsolutions.com.au/debt-recycling-guide/).
**The final module points staff at the firm's internal debt transfer
instructions** — that procedure is not reproduced here, and the placeholder in
module 10 should be replaced with a link to it.
