# Architecture — MyWealth PY Program app

How the multi-user app is put together, and why.

## The core idea

The original Professional Year Program is a large, carefully-branded single-file
HTML app (`public/py-app.html`). Rather than re-implement thousands of lines of
bespoke UI and risk losing fidelity, we **preserve it verbatim** and wrap it in a
real authentication + multi-user shell. The shell owns *who you are* and *whose
record you're looking at*; the tracker owns *the Professional Year itself*.

```
┌─────────────────────────────────────────────────────────────┐
│ App shell (Next.js)  — src/app, src/components/shell         │
│  • Login + session (role)                                   │
│  • Candidate → their own tracker                            │
│  • Supervisor → list of their candidates → tracker          │
│  • PY Manager → everyone + admin (create accounts, assign)  │
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │ <iframe srcDoc>  public/py-app.html (verbatim)     │    │
│   │  • state + locked role injected before boot        │    │
│   │  • every save → postMessage up to the shell        │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
│ Data layer — src/lib/py/backend.ts (PyBackend interface)    │
│  • DemoBackend      (in-browser localStorage)               │
│  • SupabaseBackend  (Auth + Postgres + Realtime, RLS)       │
└─────────────────────────────────────────────────────────────┘
```

## The shell ↔ tracker bridge

`public/py-app.html` is the original app with a handful of surgical edits (all
guarded by a `window.__PY_EMBED__` flag, so the file still runs standalone):

1. **State injection.** The shell builds the iframe with `srcDoc`, replacing a
   `<!--PY_BOOT_INJECT-->` marker with a boot script that sets
   `window.__PY_STATE__` (this candidate's record) and `window.__PY_ROLE__`
   (`candidate` or `supervisor`) before the app's own script runs. The boot script
   removes itself so it never leaks into an exported copy.
2. **Persistence.** `persist()` — instead of writing this browser's localStorage
   (which would blend candidates together) — posts `{type:'py:save', state}` to the
   parent. `loadState()` ignores localStorage when embedded and hydrates from the
   injected state.
3. **Role lock.** On boot the in-app candidate/supervisor toggle is hidden and the
   role is forced to the server-authorised value, so a candidate can't self-escalate.

The shell's `TrackerFrame` component debounces those `py:save` messages and writes
them to the backend against the correct candidate id.

## Roles & access

`Profile.role` is one of `candidate | supervisor | py_manager`. A candidate's
`supervisorId` links them to a supervisor. Visibility is defined once, in
`canView(viewer, candidate)`:

- **candidate** → only themselves
- **supervisor** → candidates whose `supervisorId` is them
- **py_manager** → everyone

The demo backend applies this in `listProfiles` / `getRecord` / `saveRecord`. The
live backend relies on the **identical policy expressed as Postgres Row-Level
Security** (`supabase/migrations/0001_init.sql`), so the boundary holds server-side
even if the UI were bypassed. Both are covered by `tests/unit/py.test.ts`.

## Data model

- **`profiles`** — `id` (= auth user id), `role`, `full_name`, `email`,
  `supervisor_id`.
- **`program_state`** — one row per candidate: `candidate_id`, `supervisor_id`
  (denormalised for cheap RLS), and `state jsonb` (the opaque tracker record — the
  shell stores and forwards it without needing to understand its internals).

RLS role lookups go through `security definer` helper functions so a policy on
`profiles` never re-queries `profiles` under the invoker (avoids infinite
recursion — a common Supabase pitfall).

## Demo vs live

| | Demo (default) | Live (Supabase) |
| --- | --- | --- |
| Auth | seeded accounts, password `mywealth` | real email/password |
| Storage | this browser (localStorage) | Postgres |
| Cross-device sync | ✗ single device | ✓ real-time (Supabase Realtime) |
| Account creation | in-browser | `/api/admin/create-account` (service role) |

The same `PyBackend` interface and the same `computeProgress` / `canView` logic run
in both, so behaviour is identical — only the storage swaps.

## Known limitations / next steps

- Demo persistence is per-browser (by design). Live mode removes this.
- Live account creation returns a temporary password for the manager to relay;
  wiring Supabase invite emails is a natural next step.
- When a supervisor/manager has a candidate's tracker open and that candidate edits
  from another device, the dashboards live-refresh; the open tracker iframe is not
  hot-patched mid-edit (reopen to see remote changes). A "new updates — refresh"
  affordance inside the tracker is a possible enhancement.
