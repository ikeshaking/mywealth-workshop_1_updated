-- ===========================================================================
-- Mabel — initial schema
-- Postgres / Supabase. Every user-owned table has Row Level Security enabled
-- so a signed-in user can only ever read or write their own rows.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- enums -----------------------------------------------------------------
create type category as enum (
  'bill','renewal','appointment','errand','purchase','decision',
  'subscription','household','family','travel','document','general'
);

create type item_status as enum (
  'captured','needs_information','needs_attention','researching',
  'ready_for_approval','scheduled','in_progress','completed','dismissed'
);

create type priority as enum ('low','medium','high','urgent');
create type permission_level as enum ('observe','prepare','approve','autopilot');
create type approval_status as enum ('pending','approved','rejected','snoozed');
create type household_type as enum ('solo','couple','family','shared');
create type notification_preference as enum ('all','important','quiet');
create type message_role as enum ('user','mabel');

-- --- households ------------------------------------------------------------
create table households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My household',
  type household_type not null default 'solo',
  created_at timestamptz not null default now()
);

-- --- user preferences ------------------------------------------------------
create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text not null default '',
  household_id uuid references households(id) on delete set null,
  household_type household_type not null default 'solo',
  focus_areas category[] not null default '{}',
  notification_preference notification_preference not null default 'important',
  proactive_suggestions boolean not null default true,
  permission_level permission_level not null default 'approve',
  currency text not null default 'GBP',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- life items ------------------------------------------------------------
create table life_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  original_input text not null,
  summary text not null default '',
  category category not null default 'general',
  status item_status not null default 'captured',
  priority priority not null default 'medium',
  due_date date,
  reminder_date date,
  follow_up_date date,
  source text not null default 'chat',
  context text,
  recommended_action text,
  approval_required boolean not null default false,
  confidence_score real not null default 0.5,
  inferred jsonb not null default '{}'::jsonb,
  money_saved numeric,
  time_saved_minutes integer,
  outcome_summary text,
  decision_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index life_items_user_status_idx on life_items(user_id, status);

-- --- item notes ------------------------------------------------------------
create table item_notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references life_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- --- item events (timeline) ------------------------------------------------
create table item_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references life_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- --- reminders -------------------------------------------------------------
create table reminders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references life_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fire_at timestamptz not null,
  message text not null,
  fired boolean not null default false,
  created_at timestamptz not null default now()
);
create index reminders_due_idx on reminders(user_id, fired, fire_at);

-- --- approvals -------------------------------------------------------------
create table approvals (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references life_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  reason text not null,
  expected_cost numeric,
  shares text not null default '',
  reversible boolean not null default true,
  status approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- --- decision requests -----------------------------------------------------
create table decision_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references life_items(id) on delete set null,
  request text not null,
  preferences text[] not null default '{}',
  currency text not null default 'GBP',
  budget numeric,
  created_at timestamptz not null default now()
);

-- --- recommendation sets & options -----------------------------------------
create table recommendation_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision_request_id uuid not null references decision_requests(id) on delete cascade,
  summary text not null default '',
  created_at timestamptz not null default now()
);

create table recommendation_options (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references recommendation_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_best_match boolean not null default false,
  total_price numeric not null default 0,
  currency text not null default 'GBP',
  items jsonb not null default '[]'::jsonb,
  advantages text[] not null default '{}',
  trade_offs text[] not null default '{}',
  why_it_suits text not null default '',
  retailer_label text not null default '',
  retailer_url text not null default '',
  delivery text not null default '',
  sizing_notes text,
  saved boolean not null default false,
  rejected boolean not null default false,
  created_at timestamptz not null default now()
);

-- --- conversations & messages ----------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Chat with Mabel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role message_role not null,
  body text not null,
  item_id uuid references life_items(id) on delete set null,
  decision_request_id uuid references decision_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

-- --- integrations ----------------------------------------------------------
create table integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  connected boolean not null default false,
  created_at timestamptz not null default now()
);

-- --- updated_at trigger -----------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger life_items_updated_at before update on life_items
  for each row execute function set_updated_at();
create trigger user_preferences_updated_at before update on user_preferences
  for each row execute function set_updated_at();

-- ===========================================================================
-- Row Level Security: users only ever touch their own rows.
-- ===========================================================================
alter table households enable row level security;
alter table user_preferences enable row level security;
alter table life_items enable row level security;
alter table item_notes enable row level security;
alter table item_events enable row level security;
alter table reminders enable row level security;
alter table approvals enable row level security;
alter table decision_requests enable row level security;
alter table recommendation_sets enable row level security;
alter table recommendation_options enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table integrations enable row level security;

-- Generic "owner" policy applied to every user-scoped table.
create policy "own rows - households" on households
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

do $$
declare t text;
begin
  foreach t in array array[
    'user_preferences','life_items','item_notes','item_events','reminders',
    'approvals','decision_requests','recommendation_sets','recommendation_options',
    'conversations','messages','integrations'
  ]
  loop
    execute format(
      'create policy "own rows - %1$s" on %1$s using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;
