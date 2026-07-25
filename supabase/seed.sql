-- =============================================================================
-- seed.sql
-- Example / development seed data for the Professional Year (PY) Program.
-- Target: LOCAL / dev Supabase (PostgreSQL 15).
--
-- WHAT THIS SEEDS
--   1 py_manager  : Priya Anand   (priya@mywealth.demo)
--   2 supervisors : Sarah Nguyen  (sarah@mywealth.demo)
--                   David Chen    (david@mywealth.demo)
--   4 candidates  : Alex Taylor   (alex@mywealth.demo)   -> Sarah
--                   Jordan Lee    (jordan@mywealth.demo) -> Sarah
--                   Sam Patel     (sam@mywealth.demo)    -> David
--                   Riya Shah     (riya@mywealth.demo)   -> David
--   + one empty program_state row per candidate.
--
-- -----------------------------------------------------------------------------
-- READ ME FIRST — auth.users must exist BEFORE these inserts
-- -----------------------------------------------------------------------------
-- public.profiles.id references auth.users(id). You therefore CANNOT insert a
-- profile until a matching auth user exists. In a real project you would:
--
--   1. Create each auth user first, e.g.
--        - Supabase Dashboard -> Authentication -> Add user, OR
--        - Admin API:  supabase.auth.admin.createUser({ email, password }), OR
--        - SQL against auth.users (service role only; not recommended by hand).
--   2. Collect the resulting UUIDs.
--   3. Replace the placeholder UUIDs below with the real ones and run this file.
--
-- The UUIDs below (00000000-0000-0000-0000-00000000000X) are CLEARLY-MARKED
-- PLACEHOLDERS. They will only satisfy the foreign key to auth.users if you
-- created auth users with these exact ids (possible locally via the admin API).
-- Every insert uses `on conflict do nothing` so re-running is safe and so the
-- seed will not error out on rows that already exist.
--
-- NOTE: If the referenced auth.users rows do not exist, the profile inserts
-- will fail the foreign-key constraint. That is expected — create the auth
-- users first (see step 1) or adapt the ids to match your local auth users.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Placeholder UUIDs (replace with real auth.users ids)
-- ---------------------------------------------------------------------------
--   Priya  (py_manager) : 00000000-0000-0000-0000-000000000001
--   Sarah  (supervisor) : 00000000-0000-0000-0000-000000000002
--   David  (supervisor) : 00000000-0000-0000-0000-000000000003
--   Alex   (candidate)  : 00000000-0000-0000-0000-000000000004
--   Jordan (candidate)  : 00000000-0000-0000-0000-000000000005
--   Sam    (candidate)  : 00000000-0000-0000-0000-000000000006
--   Riya   (candidate)  : 00000000-0000-0000-0000-000000000007

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- PY manager -----------------------------------------------------------------
insert into public.profiles (id, role, full_name, email, supervisor_id)
values
  ('00000000-0000-0000-0000-000000000001', 'py_manager', 'Priya Anand', 'priya@mywealth.demo', null)
on conflict (id) do nothing;

-- Supervisors ----------------------------------------------------------------
insert into public.profiles (id, role, full_name, email, supervisor_id)
values
  ('00000000-0000-0000-0000-000000000002', 'supervisor', 'Sarah Nguyen', 'sarah@mywealth.demo', null),
  ('00000000-0000-0000-0000-000000000003', 'supervisor', 'David Chen',   'david@mywealth.demo', null)
on conflict (id) do nothing;

-- Candidates (supervisor_id points at the supervisor they report to) ---------
insert into public.profiles (id, role, full_name, email, supervisor_id)
values
  -- Sarah's candidates
  ('00000000-0000-0000-0000-000000000004', 'candidate', 'Alex Taylor', 'alex@mywealth.demo',   '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000005', 'candidate', 'Jordan Lee',  'jordan@mywealth.demo', '00000000-0000-0000-0000-000000000002'),
  -- David's candidates
  ('00000000-0000-0000-0000-000000000006', 'candidate', 'Sam Patel',   'sam@mywealth.demo',    '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000007', 'candidate', 'Riya Shah',   'riya@mywealth.demo',   '00000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Program state — one empty blob per candidate
-- supervisor_id is denormalised from the candidate's profile for RLS.
-- ---------------------------------------------------------------------------
insert into public.program_state (candidate_id, supervisor_id, state, updated_by)
values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '{}'::jsonb, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', '{}'::jsonb, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', '{}'::jsonb, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', '{}'::jsonb, '00000000-0000-0000-0000-000000000001')
on conflict (candidate_id) do nothing;

-- =============================================================================
-- End of seed.sql
-- =============================================================================
