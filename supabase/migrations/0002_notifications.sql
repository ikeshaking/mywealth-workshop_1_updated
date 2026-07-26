-- =============================================================================
-- 0002_notifications.sql
-- Professional Year (PY) Program — email notification preferences & send log
-- Target: Supabase / PostgreSQL 15
--
-- WHAT THIS MIGRATION ADDS
--   1. public.notification_prefs — one row per user, holding per-channel opt-in
--      flags for the four notification kinds the program sends:
--        * daily_digest    — supervisor/manager digest of items awaiting sign-off
--        * monthly_summary — monthly progress roll-up
--        * at_risk_alerts  — alerts when a candidate falls behind schedule
--        * nudges          — candidate-facing reminders when progress stalls
--   2. public.notification_log — an append-only audit trail that doubles as the
--      DEDUPLICATION mechanism. A unique constraint on
--      (recipient_id, kind, dedupe_key) means a duplicate send is prevented by
--      an insert conflict rather than by an application-side "have I sent this?"
--      query, which would be racy.
--
-- SERVICE-ROLE-ONLY WRITES (important)
--   The notification cron runs server-side with the Supabase SERVICE ROLE key,
--   which BYPASSES RLS entirely. Consequently there are deliberately NO
--   insert/update/delete policies on public.notification_log for the
--   `authenticated` role, and no table-level write grants for it either:
--   normal clients can only READ their own log rows. All notification_log rows
--   are written by the server-side job.
--
-- RECURSION NOTE
--   As in 0001, policies use the SECURITY DEFINER helpers public.current_role()
--   / public.is_py_manager() instead of sub-selecting public.profiles inline,
--   so they never re-enter profiles' RLS.
-- =============================================================================

-- pgcrypto (gen_random_uuid()) is already enabled by 0001; re-assert defensively
-- so this migration is safe to apply against a fresh database on its own.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- notification_prefs: one row per user describing which emails they want.
-- Defaults are opt-IN (true) for every channel; a missing row is therefore
-- equivalent to "all notifications enabled" and the cron should treat it that
-- way (left join from profiles, coalesce(..., true)).
create table if not exists public.notification_prefs (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  -- Digest of items currently awaiting this user's sign-off (supervisors/managers).
  daily_digest    boolean not null default true,
  -- Monthly progress roll-up email.
  monthly_summary boolean not null default true,
  -- Alerts raised when a candidate is tracking behind the expected schedule.
  at_risk_alerts  boolean not null default true,
  -- Candidate-facing stall nudges ("no activity for N days").
  nudges          boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- notification_log: append-only record of every email actually sent.
-- Purpose is twofold:
--   (a) DEDUPLICATION — the unique constraint below turns "have we already sent
--       this?" into an insert conflict, e.g. the cron inserts
--       dedupe_key = 'signoff:<candidate_id>:<module_id>' before sending and
--       skips the send on conflict, so a module sign-off is never emailed twice;
--       a monthly summary uses dedupe_key = 'monthly:2026-07' so it can only be
--       sent once per recipient per calendar month.
--   (b) AUDIT — a queryable history of what was sent, to whom and when, with
--       arbitrary per-send context in `meta` (subject, item ids, provider
--       message id, ...).
create table if not exists public.notification_log (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('daily_digest','monthly_summary','at_risk','nudge')),
  -- Caller-computed stable key identifying the *thing* being notified about.
  -- Examples: 'signoff:<candidate_id>:<module_id>', 'monthly:2026-07',
  --           'at_risk:<candidate_id>:2026-07-26', 'nudge:<candidate_id>:2026-W30'.
  dedupe_key   text not null,
  sent_at      timestamptz not null default now(),
  -- Free-form context about the send (subject line, item ids, provider ids...).
  meta         jsonb not null default '{}'::jsonb
);

-- The deduplication guarantee: one (recipient, kind, dedupe_key) triple may only
-- ever exist once. The cron relies on the resulting unique violation /
-- `on conflict do nothing` to decide whether an email still needs sending.
-- Named uniquely and created conditionally so the migration stays re-runnable.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_log_recipient_kind_dedupe_key'
      and conrelid = 'public.notification_log'::regclass
  ) then
    alter table public.notification_log
      add constraint notification_log_recipient_kind_dedupe_key
      unique (recipient_id, kind, dedupe_key);
  end if;
end
$$;

-- Supports "recent notifications for this user" reads (the audit view, and the
-- cron's per-recipient rate-limit checks).
create index if not exists notification_log_recipient_sent_at_idx
  on public.notification_log (recipient_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

-- Keeps notification_prefs.updated_at honest: clients cannot forge or forget it
-- because the trigger overwrites whatever value was supplied on UPDATE.
create or replace function public.set_notification_prefs_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notification_prefs_set_updated_at on public.notification_prefs;
create trigger notification_prefs_set_updated_at
  before update on public.notification_prefs
  for each row
  execute function public.set_notification_prefs_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.notification_prefs enable row level security;
alter table public.notification_log   enable row level security;

-- ===========================================================================
-- notification_prefs policies
-- ===========================================================================
-- Access model:
--   * any authenticated user -> select / insert / update their OWN row only.
--   * py_manager             -> full CRUD on ALL rows (support + bulk opt-outs).
--   * nobody else can read or write another user's preferences.
-- Deletes are restricted to py_manager; ordinary users turn channels off by
-- setting the booleans to false rather than removing the row (a missing row
-- means "all enabled").
-- ===========================================================================

-- --- SELECT -----------------------------------------------------------------

-- A user may read their own preference row.
drop policy if exists notification_prefs_select_own on public.notification_prefs;
create policy notification_prefs_select_own
  on public.notification_prefs
  for select
  to authenticated
  using (user_id = auth.uid());

-- A py_manager may read everyone's preferences.
drop policy if exists notification_prefs_select_manager on public.notification_prefs;
create policy notification_prefs_select_manager
  on public.notification_prefs
  for select
  to authenticated
  using (public.is_py_manager());

-- --- INSERT -----------------------------------------------------------------

-- A user may create their own preference row (first time they open settings).
drop policy if exists notification_prefs_insert_own on public.notification_prefs;
create policy notification_prefs_insert_own
  on public.notification_prefs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- A py_manager may create a preference row for any user.
drop policy if exists notification_prefs_insert_manager on public.notification_prefs;
create policy notification_prefs_insert_manager
  on public.notification_prefs
  for insert
  to authenticated
  with check (public.is_py_manager());

-- --- UPDATE -----------------------------------------------------------------

-- A user may change their own preferences. The WITH CHECK clause repeats the
-- predicate so a row cannot be re-pointed at another user_id.
drop policy if exists notification_prefs_update_own on public.notification_prefs;
create policy notification_prefs_update_own
  on public.notification_prefs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A py_manager may change anyone's preferences.
drop policy if exists notification_prefs_update_manager on public.notification_prefs;
create policy notification_prefs_update_manager
  on public.notification_prefs
  for update
  to authenticated
  using (public.is_py_manager())
  with check (public.is_py_manager());

-- --- DELETE (py_manager only) ----------------------------------------------

drop policy if exists notification_prefs_delete_manager on public.notification_prefs;
create policy notification_prefs_delete_manager
  on public.notification_prefs
  for delete
  to authenticated
  using (public.is_py_manager());

-- ===========================================================================
-- notification_log policies
-- ===========================================================================
-- Access model:
--   * any authenticated user -> SELECT their own log rows (recipient_id = self).
--   * py_manager             -> SELECT all log rows (audit / support).
--   * NOBODY using an anon or authenticated JWT may insert, update or delete.
--
-- There are intentionally no write policies here. Notification rows are written
-- exclusively by the server-side cron using the SUPABASE SERVICE-ROLE KEY, which
-- bypasses RLS; the log must remain an append-only, tamper-proof audit trail and
-- its unique (recipient_id, kind, dedupe_key) constraint is the only thing
-- standing between a user and a duplicate email, so clients must not be able to
-- delete rows out of it. The matching table-level grants below likewise give
-- `authenticated` SELECT only.
-- ===========================================================================

-- --- SELECT -----------------------------------------------------------------

-- A user may read the notifications that were sent to them.
drop policy if exists notification_log_select_own on public.notification_log;
create policy notification_log_select_own
  on public.notification_log
  for select
  to authenticated
  using (recipient_id = auth.uid());

-- A py_manager may read the whole notification history.
drop policy if exists notification_log_select_manager on public.notification_log;
create policy notification_log_select_manager
  on public.notification_log
  for select
  to authenticated
  using (public.is_py_manager());

-- --- INSERT / UPDATE / DELETE ----------------------------------------------
-- Deliberately omitted: service-role only (see the note above). Any previously
-- created write policies are dropped so re-running this migration converges on
-- the read-only-for-clients state.
drop policy if exists notification_log_insert_own     on public.notification_log;
drop policy if exists notification_log_insert_manager on public.notification_log;
drop policy if exists notification_log_update_manager on public.notification_log;
drop policy if exists notification_log_delete_manager on public.notification_log;

-- ---------------------------------------------------------------------------
-- Table-level grants
-- ---------------------------------------------------------------------------
-- RLS decides *which rows*; grants decide *which verbs* the API roles may
-- attempt. Actual row visibility is still governed by the policies above.
grant select, insert, update, delete on public.notification_prefs to authenticated;

-- Read-only for API clients. Writes come from the service role, which bypasses
-- both grants and RLS.
grant select on public.notification_log to authenticated;
revoke insert, update, delete on public.notification_log from authenticated;

-- =============================================================================
-- End of 0002_notifications.sql
-- =============================================================================
