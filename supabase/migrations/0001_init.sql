-- =============================================================================
-- 0001_init.sql
-- Professional Year (PY) Program — multi-user backend schema
-- Target: Supabase / PostgreSQL 15
--
-- Roles: 'candidate', 'supervisor', 'py_manager'
-- The app tracks each candidate's PY progress as an opaque JSON blob
-- (public.program_state.state).
--
-- IMPORTANT RLS NOTE (recursion avoidance):
--   Row Level Security policies on `public.profiles` must NOT run a subquery
--   against `public.profiles` under the *invoker's* privileges, because that
--   subquery would itself be subject to the same RLS policies, which triggers
--   infinite recursion (a well-known Supabase pitfall).
--   We solve this with SECURITY DEFINER helper functions
--   (current_role() / is_py_manager()) that run as the function owner and thus
--   BYPASS RLS when reading the caller's own role. Policies call those helpers
--   instead of querying profiles inline.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
-- pgcrypto provides gen_random_uuid(). User ids come from auth.users so we do
-- not generate them here, but we enable it defensively for any future use.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- profiles: one row per application user, keyed to the Supabase auth user.
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          text not null check (role in ('candidate','supervisor','py_manager')),
  full_name     text not null default '',
  email         text not null default '',
  -- Only meaningful for candidates: the supervisor they report to. NULL otherwise.
  supervisor_id uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);

-- Helpful index for supervisor -> candidates lookups (also used by RLS).
create index if not exists profiles_supervisor_id_idx
  on public.profiles (supervisor_id);

-- program_state: one row per candidate holding the opaque PY progress blob.
create table if not exists public.program_state (
  candidate_id  uuid primary key references public.profiles (id) on delete cascade,
  -- Denormalised for RLS convenience; kept in sync by the app (or a trigger).
  supervisor_id uuid references public.profiles (id),
  state         jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles (id)
);

create index if not exists program_state_supervisor_id_idx
  on public.program_state (supervisor_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to bypass RLS and avoid recursion)
-- ---------------------------------------------------------------------------

-- Returns the role of the currently authenticated caller (auth.uid()),
-- or NULL if the caller has no profile row.
-- SECURITY DEFINER: executes as the function owner so the SELECT below is NOT
-- constrained by profiles' RLS policies -> no recursion.
-- STABLE: result does not change within a single statement.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

-- Convenience boolean: is the caller a py_manager?
create or replace function public.is_py_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'py_manager', false);
$$;

-- Lock down execution: allow the API roles to call the helpers, but they still
-- only ever see the caller's own role because they filter on auth.uid().
revoke all on function public.current_role() from public;
revoke all on function public.is_py_manager() from public;
grant execute on function public.current_role() to authenticated, service_role;
grant execute on function public.is_py_manager() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.program_state enable row level security;

-- ===========================================================================
-- profiles policies
-- ===========================================================================
-- Access model:
--   * py_manager  -> full CRUD on ALL profiles.
--   * supervisor  -> select their own row + rows of candidates that report to
--                    them (supervisor_id = auth.uid()).
--   * candidate   -> select only their own row.
--   * everyone authenticated -> may always select their own row.
-- Recursion note: py_manager / supervisor checks use is_py_manager() /
-- current_role() helper functions (SECURITY DEFINER) rather than sub-selecting
-- profiles, so these policies never re-enter profiles' RLS.
-- ===========================================================================

-- --- SELECT -----------------------------------------------------------------

-- Any authenticated user may read their own profile row.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- A supervisor may read the profiles of candidates assigned to them.
drop policy if exists profiles_select_supervisor_candidates on public.profiles;
create policy profiles_select_supervisor_candidates
  on public.profiles
  for select
  to authenticated
  using (
    supervisor_id = auth.uid()
    and public.current_role() = 'supervisor'
  );

-- A py_manager may read every profile.
drop policy if exists profiles_select_manager on public.profiles;
create policy profiles_select_manager
  on public.profiles
  for select
  to authenticated
  using (public.is_py_manager());

-- --- INSERT / UPDATE / DELETE (py_manager only) -----------------------------
-- Profile creation is an explicit administrative action performed by a
-- py_manager (there is deliberately NO auth.users trigger auto-creating
-- profiles).

drop policy if exists profiles_insert_manager on public.profiles;
create policy profiles_insert_manager
  on public.profiles
  for insert
  to authenticated
  with check (public.is_py_manager());

drop policy if exists profiles_update_manager on public.profiles;
create policy profiles_update_manager
  on public.profiles
  for update
  to authenticated
  using (public.is_py_manager())
  with check (public.is_py_manager());

drop policy if exists profiles_delete_manager on public.profiles;
create policy profiles_delete_manager
  on public.profiles
  for delete
  to authenticated
  using (public.is_py_manager());

-- ===========================================================================
-- program_state policies
-- ===========================================================================
-- Access model:
--   * candidate   -> select / insert / update rows where candidate_id = auth.uid().
--   * supervisor  -> select / update rows where supervisor_id = auth.uid().
--   * py_manager  -> full CRUD on ALL rows.
-- These reference profiles only indirectly (via helper functions), so there is
-- no recursion concern here; program_state RLS never queries program_state.
-- ===========================================================================

-- --- SELECT -----------------------------------------------------------------

-- Candidate reads their own progress row.
drop policy if exists program_state_select_candidate on public.program_state;
create policy program_state_select_candidate
  on public.program_state
  for select
  to authenticated
  using (candidate_id = auth.uid());

-- Supervisor reads progress rows of their candidates (denormalised column).
drop policy if exists program_state_select_supervisor on public.program_state;
create policy program_state_select_supervisor
  on public.program_state
  for select
  to authenticated
  using (supervisor_id = auth.uid());

-- py_manager reads everything.
drop policy if exists program_state_select_manager on public.program_state;
create policy program_state_select_manager
  on public.program_state
  for select
  to authenticated
  using (public.is_py_manager());

-- --- INSERT -----------------------------------------------------------------

-- Candidate may create their own progress row.
drop policy if exists program_state_insert_candidate on public.program_state;
create policy program_state_insert_candidate
  on public.program_state
  for insert
  to authenticated
  with check (candidate_id = auth.uid());

-- py_manager may create any progress row.
drop policy if exists program_state_insert_manager on public.program_state;
create policy program_state_insert_manager
  on public.program_state
  for insert
  to authenticated
  with check (public.is_py_manager());

-- --- UPDATE -----------------------------------------------------------------

-- Candidate may update their own progress row.
drop policy if exists program_state_update_candidate on public.program_state;
create policy program_state_update_candidate
  on public.program_state
  for update
  to authenticated
  using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid());

-- Supervisor may update progress rows of their candidates.
drop policy if exists program_state_update_supervisor on public.program_state;
create policy program_state_update_supervisor
  on public.program_state
  for update
  to authenticated
  using (supervisor_id = auth.uid())
  with check (supervisor_id = auth.uid());

-- py_manager may update any progress row.
drop policy if exists program_state_update_manager on public.program_state;
create policy program_state_update_manager
  on public.program_state
  for update
  to authenticated
  using (public.is_py_manager())
  with check (public.is_py_manager());

-- --- DELETE (py_manager only) ----------------------------------------------

drop policy if exists program_state_delete_manager on public.program_state;
create policy program_state_delete_manager
  on public.program_state
  for delete
  to authenticated
  using (public.is_py_manager());

-- ---------------------------------------------------------------------------
-- Table-level grants
-- ---------------------------------------------------------------------------
-- RLS decides *which rows*; grants decide *which verbs* the API roles may
-- attempt. Actual row visibility is still governed by the policies above.
grant select, insert, update, delete on public.profiles      to authenticated;
grant select, insert, update, delete on public.program_state to authenticated;

-- =============================================================================
-- End of 0001_init.sql
-- =============================================================================
