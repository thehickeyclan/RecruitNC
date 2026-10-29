-- The published order of every state's class board, kept as its own snapshot (Matt, 29 October 2026).
--
-- North Carolina publishes into athletes.prospect_ranking, and fifteen readers (profiles, the app,
-- the home page, the ranked-opponent index) treat that column as North Carolina's. A South Carolina
-- rank written there would print "RecruitNC #1" on an SC profile and interleave two #1s on NC pages.
-- So another state's published order lives here and only the pages that ask for a state read it.
-- North Carolina writes here too, which is what lets the next publish say who moved and who is new.
--
-- previous_rank: the wrestler's rank in the edition this one replaced (null if he was not in it).
-- is_new:        he was not in the replaced edition, and there was one. A first edition marks no one.

create table if not exists public.ranking_published (
  state         text        not null default 'NC',
  class_year    integer     not null,
  gender        text        not null,
  athlete_id    uuid        not null references public.athletes(id) on delete cascade,
  rank          integer     not null check (rank >= 1),
  previous_rank integer,
  is_new        boolean     not null default false,
  published_at  timestamptz not null default now(),
  primary key (state, class_year, gender, athlete_id)
);

create index if not exists ranking_published_board_idx
  on public.ranking_published (state, class_year, gender, rank);

-- Server-only: the public pages read it with the service role, behind their own membership gate.
alter table public.ranking_published enable row level security;
