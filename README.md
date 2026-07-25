# Mabel

**Tell Mabel once. She handles the rest.**

Mabel is a warm, calm, mobile-first AI personal assistant for life admin, decisions,
purchases and household tasks. She absorbs messy thoughts, messages and intentions,
turns them into structured items, tracks them automatically and moves them towards
completion — without asking you to maintain lists or manage a system.

> Life admin, decisions and everyday tasks — quietly handled.

This repository is a fully working MVP. **It runs with zero configuration in demo
mode** (seeded data, a deterministic offline AI parser, and simulated actions), and
upgrades cleanly to live OpenAI + Supabase when you add credentials.

---

## Quick start (demo mode)

```bash
npm install
npm run dev
# open http://localhost:3000
```

On the login screen, tap **“Explore the demo as Alex”** — no account needed. You land
on a pre-seeded dashboard with a car registration, an electricity bill, a gym
cancellation awaiting approval, an outdoor-dining decision, and more.

No environment variables are required. Demo mode is the default.

### Useful routes

| Route | What it is |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup`, `/forgot-password` | Auth (demo) |
| `/onboarding` | Short, essential-only setup |
| `/dashboard` | Calm home briefing + “Tell Mabel anything…” |
| `/capture` | Conversational capture (chat with Mabel) |
| `/items/[id]` | Item detail (timeline, reminders, approvals, notes) |
| `/decisions`, `/decisions/[id]` | Decisions & shopping recommendations |
| `/approvals` | Approve / edit / snooze / reject |
| `/completed` | Outcomes, money & time saved |
| `/settings` | Profile, permissions, privacy, data export |
| `/preview` | Index of every major screen (handy for QA/screenshots) |

---

## Scripts

```bash
npm run dev         # start the dev server
npm run build       # production build
npm run start       # run the production build
npm run lint        # ESLint (next lint)
npm run typecheck   # tsc --noEmit
npm run test        # Vitest unit/component tests
npm run test:e2e    # Playwright end-to-end (five core flows)
npm run verify      # lint + typecheck + unit tests + build
```

---

## The four core capabilities

1. **Conversational capture** — type natural language; Mabel converts each message into a
   structured item and confirms warmly, asking only for genuinely missing details.
2. **Smart task & obligation engine** — classifies items (bill, renewal, appointment,
   errand, purchase, decision, subscription, household, family, travel, document, general)
   with a status machine and priorities. Inferred fields are visibly marked.
3. **Decision & shopping assistant** — returns 2–3 **complete bundled solutions** (not
   isolated products) with a clear best match, totals, inclusions, pros/trade-offs,
   delivery and sizing. Compare, save, reject, approve.
4. **Proactive nudging** — an app-level reminder simulation surfaces gentle, supportive
   nudges without you managing anything.

### The five demo flows (all covered by Playwright)

1. **Car registration** — capture with an unknown due date, add it, prepare for approval.
2. **Bill reminder** — capture a reminder, mark it paid, see it in Completed.
3. **Shopping decision** — outdoor dining bundles under $2,000, best match, approve.
4. **Subscription cancellation** — gym cancellation prepared, approved, completed.
5. **Family appointment** — dentist booking; Mabel asks who and when.

---

## Demo mode vs. live services

Everything is designed so the app is fully functional offline, then upgrades in place.

### AI extraction

- **Demo (default):** `POST /api/extract` runs a deterministic **fallback parser**
  (`src/lib/ai/fallback.ts`). It classifies intent, extracts explicit dates/budgets,
  and **never invents** dates or costs it wasn’t given.
- **Live:** set `OPENAI_API_KEY`. The same server route then calls OpenAI with a strict
  prompt + **Zod-validated** JSON output (`src/lib/ai/openai.ts`). On any failure it
  silently falls back, so the app never breaks. **The key is read server-side only and
  is never exposed to the browser.**

### Data & auth

- **Demo (default):** all data lives in an in-browser store
  (`src/lib/store/MabelProvider.tsx`) seeded from `src/lib/demo/seed.ts` and persisted to
  `localStorage`. Auth is a lightweight demo session (`src/lib/auth.ts`).
- **Live:** set the Supabase env vars and `NEXT_PUBLIC_DEMO_MODE=false`. Migrations and
  RLS policies are in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql);
  optional seed in [`supabase/seed.sql`](supabase/seed.sql). Supabase clients are wired in
  `src/lib/supabase/`. Every user-owned table has **Row Level Security** (`auth.uid() = user_id`).

### Switching to live mode

1. Copy `.env.example` → `.env.local` and fill in values.
2. Set `NEXT_PUBLIC_DEMO_MODE=false`.
3. Create a Supabase project and run the migration:
   ```bash
   # with the Supabase CLI
   supabase db push
   # or paste supabase/migrations/0001_init.sql into the SQL editor
   ```
4. (Optional) Add `OPENAI_API_KEY` for real extraction.
5. Restart the dev server.

> The demo store and live Supabase path share the same domain types (`src/lib/types.ts`)
> and the same pure business logic (`src/lib/store/operations.ts`), so behaviour is
> identical across both.

---

## Environment variables

See [`.env.example`](.env.example). All are optional in demo mode.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | `true` (default) uses the in-browser store + fallback AI. |
| `OPENAI_API_KEY` | Server-side only. Enables real extraction; omit to use the fallback. |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini`. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Live persistence + auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, for trusted jobs. Never exposed to the browser. |

---

## Trust & privacy

Trust is visible in the UI, not buried in settings:

- Clear permission levels (Observe · Prepare · Approve · Autopilot-coming-soon).
- Every external action is previewed and **requires approval**; nothing is ever
  auto-executed. In demo mode all actions are **simulated and labelled as such** — Mabel
  never claims a real payment, booking or cancellation happened.
- Activity timeline per item; simulated actions can be **undone**.
- Inferred fields are tagged with a ✦ “inferred” marker.
- Data export and account deletion from Settings.

---

## Accessibility

Keyboard navigation, semantic HTML, visible focus rings, skip-to-content link, accessible
form labels/roles, sufficient contrast, and `prefers-reduced-motion` support.

---

## Deployment (Vercel)

1. Import the repo into Vercel.
2. It builds with the default `npm run build`. **It deploys and runs in demo mode with no
   env vars.**
3. To go live, add the environment variables above in the Vercel project settings and set
   `NEXT_PUBLIC_DEMO_MODE=false`.

---

## Testing

- **Unit/component (Vitest):** extraction schema, fallback parser, item creation, status
  transitions, reminder generation, approval lifecycle, recommendation engine + display,
  auth guards, and RLS data-access assumptions.
- **E2E (Playwright):** one test per core flow (five total), mobile viewport, running the
  real production build in demo mode.

```bash
npm run test       # 40 unit/component tests
npm run test:e2e   # 5 end-to-end flows
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for a deeper tour and
[known limitations / next features](ARCHITECTURE.md#known-limitations).
