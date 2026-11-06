-- "What Matters to Your Family" (priorities survey v3, 5 Nov 2026).
-- Server-only, like questionnaire_answers: RLS on with no policies, browser roles revoked.
-- Never a column on athletes (its privacy is a deny list and new columns are readable by default),
-- never in user_metadata (a user can rewrite it from the browser). Coaches never read these.

-- One answer set per respondent per version. v1: one parent set and one athlete set per wrestler;
-- any linked parent may edit the parent set, and each version records who saved it.
create table if not exists public.priority_answer_sets (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  respondent text not null check (respondent in ('parent', 'athlete')),
  version int not null default 1,
  supersedes_id uuid references public.priority_answer_sets(id) on delete set null,
  edited_by uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (athlete_id, respondent, version)
);
create index if not exists priority_answer_sets_athlete on public.priority_answer_sets (athlete_id, respondent, version desc);

create table if not exists public.priority_answers (
  set_id uuid not null references public.priority_answer_sets(id) on delete cascade,
  question_key text not null,
  value jsonb,
  marker text check (marker in ('must', 'strong', 'flexible')),
  not_sure boolean not null default false,
  sharing text not null check (sharing in ('shared', 'constraint', 'private')),
  answered_at timestamptz not null default now(),
  primary key (set_id, question_key)
);

-- Each suggested list is stored, so a reaction is tied to the batch that prompted it.
create table if not exists public.suggestion_batches (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  respondent text not null check (respondent in ('parent', 'athlete')),
  list_kind text not null check (list_kind in ('best_fit', 'opportunity', 'starter')),
  parent_set_id uuid references public.priority_answer_sets(id) on delete set null,
  athlete_set_id uuid references public.priority_answer_sets(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);
create index if not exists suggestion_batches_athlete on public.suggestion_batches (athlete_id, generated_at desc);

create table if not exists public.suggestion_reactions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.suggestion_batches(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  school_id text not null,
  respondent text not null check (respondent in ('parent', 'athlete')),
  reacted_by uuid not null,
  reaction text not null check (reaction in ('closer_look', 'maybe', 'not_for_us')),
  reason text,
  chips text[] not null default '{}',
  sharing text not null check (sharing in ('shared', 'constraint', 'private')),
  created_at timestamptz not null default now()
);
create index if not exists suggestion_reactions_athlete on public.suggestion_reactions (athlete_id, school_id, created_at desc);

alter table public.priority_answer_sets enable row level security;
alter table public.priority_answers enable row level security;
alter table public.suggestion_batches enable row level security;
alter table public.suggestion_reactions enable row level security;
revoke all on public.priority_answer_sets, public.priority_answers, public.suggestion_batches, public.suggestion_reactions from anon, authenticated;
