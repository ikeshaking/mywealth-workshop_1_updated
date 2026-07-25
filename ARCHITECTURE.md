# Mabel — architecture notes

A quick tour of how the app is put together and why.

## Principles

- **Capture first, organise second.** The composer never forces a form; it saves the
  messy input and asks only for genuinely missing details.
- **One domain, two backends.** The same TypeScript types and the same pure business logic
  run against the demo store *and* (when configured) Supabase. Screens don’t know or care.
- **The AI layer can never break the app.** Extraction always returns schema-valid data;
  OpenAI failures fall back to a deterministic parser.
- **Trust is UI, not fine print.** Approvals, previews, inferred markers and an undo-able
  activity log are first-class.

## Layers

```
UI (App Router screens, React components)
static + client components in src/app, src/components
        │  uses hooks from the store, never touches persistence directly
        ▼
State / store  ── src/lib/store/MabelProvider.tsx
React context + localStorage persistence (demo)
delegates every mutation to ↓
        ▼
Business logic ── src/lib/store/operations.ts   (PURE, framework-free, fully unit-tested)
createItemFromExtraction · transitionStatus (guarded state machine) ·
requestApproval · resolveApproval (simulated actions) · fireDueReminders · computeMetrics
        ▼
Domain        ── src/lib/types.ts · src/lib/schemas.ts (Zod) · src/lib/catalog.ts
        │
AI            ── src/lib/ai/{extract,openai,fallback,recommend,reply,client}.ts
secure server route: src/app/api/extract/route.ts
        │
Data access   ── demo: src/lib/demo/seed.ts   |   live: src/lib/supabase/*, supabase/migrations
```

### Why a client store for demo mode?

The requirement is a *functional* MVP with persistent data and complete flows that work
with **no external services**. A localStorage-backed React store gives real persistence,
instant interactions and offline operation, while the pure `operations.ts` module keeps
all the logic testable and portable to Supabase. The Supabase schema mirrors the same
shapes column-for-column, so the live path is a drop-in swap rather than a rewrite.

## Data model

`LifeItem` is the spine (id, user_id, title, original_input, summary, category, status,
priority, due/reminder/follow-up dates, source, context, recommended_action,
approval_required, confidence_score, inferred-flags, money/time saved, outcome, timestamps).
Satellites: `ItemEvent` (timeline), `ItemNote`, `Reminder`, `Approval`, `DecisionRequest`,
`RecommendationSet` + `RecommendationOption`, `Conversation` + `Message`, `Integration`,
`UserPreferences`, `Household`.

### Status machine

`captured → needs_information / needs_attention / researching / scheduled →
ready_for_approval → in_progress → completed` (plus `dismissed`). Transitions are guarded
by `canTransition()` so illegal jumps are impossible — this is unit-tested.

### Permission model

`observe · prepare · approve · autopilot`. Autopilot is shown as **coming soon**; the MVP
never performs real external actions — approvals run a **simulated** action and record it
on the timeline (undo-able).

## AI extraction

`POST /api/extract` validates the body with Zod, then `extract()` tries OpenAI (server-side
key only) and falls back to the offline parser. Both return an object satisfying
`extractionSchema`. Guardrails: ISO-only dates, nullable unknowns, clamped confidence, a
short supportive follow-up question only when needed, and preserved original input.

## Recommendations

`recommendFor()` returns 2–3 **complete bundles** (e.g. table + chairs + cover) with a
single best match, budget-filtered, each with inclusions, advantages, trade-offs, delivery
and sizing. Realistic mock data — no live retailer calls.

## Nudging

`NudgeToaster` fires any due reminders on an interval and surfaces the newest as a calm,
dismissible toast — the app-level simulation of proactive nudging (no push infra).

## Testing strategy

- Pure logic (`operations.ts`, parser, schema, recommender) is covered directly — fast and
  deterministic.
- One component render test exercises the recommendation display.
- Playwright drives the real production build through all five core flows on a mobile
  viewport in demo mode.

<a id="known-limitations"></a>
## Known limitations

- Demo persistence is per-browser (localStorage), not multi-device. Live mode (Supabase)
  removes this.
- Voice input and image/document upload are **placeholders** (clearly labelled “coming soon”).
- Recommendations are curated mock bundles, not live retailer inventory.
- Nudges are in-app only; no real push/email notifications yet.
- Autopilot permission level is intentionally not implemented (shown as coming soon).
- Live Supabase auth UI is stubbed by the demo session; the client/server Supabase helpers
  and RLS migrations are in place for the swap, but the sign-in screens currently drive the
  demo session.

## Recommended next features

1. Real Supabase auth screens + email verification wired to the existing helpers.
2. OpenAI-powered follow-up dialogue (multi-turn clarification) beyond the single question.
3. Email/calendar ingestion so items can be captured by forwarding, not just typing.
4. Live retailer/price APIs behind the same `recommendFor` interface.
5. Real scheduled nudges (web push + server cron) replacing the in-app simulation.
6. Household sharing and multi-user approvals.
7. Autopilot with tightly-scoped, reversible, audited automatic actions.
