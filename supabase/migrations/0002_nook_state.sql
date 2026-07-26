-- ===========================================================================
-- Nook — live single-user persistence
--
-- The whole app state is stored as one JSON row per user. Simple, private,
-- and synced across every device you sign in on. Row Level Security ensures a
-- user can only ever read/write their own row.
--
-- Run this in your Supabase project's SQL editor (or via `supabase db push`).
-- ===========================================================================

create table if not exists nook_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table nook_state enable row level security;

-- A user may read their own row.
create policy "read own nook_state" on nook_state
  for select using (auth.uid() = user_id);

-- A user may insert their own row.
create policy "insert own nook_state" on nook_state
  for insert with check (auth.uid() = user_id);

-- A user may update their own row.
create policy "update own nook_state" on nook_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
