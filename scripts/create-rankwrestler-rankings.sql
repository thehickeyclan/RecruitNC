-- RankWrestler's published class rankings, kept as history.
--
-- An outside service's opinion, recorded so the ranking board can show where it disagrees with
-- ours. It is displayed, never scored: RankWrestler ranks in-state dominance and RecruitNC weights
-- national results and strength of schedule, so folding their number into our formula would quietly
-- pull it toward a different question than the one we are answering.
--
-- Keyed on class year and edition so movement is visible — "#22 in August, #13 now" is the kind of
-- outside corroboration that makes a ranking argument easier to have with a parent.

create table if not exists public.rankwrestler_rankings (
  id             uuid primary key default gen_random_uuid(),
  class_year     integer not null,
  edition        date    not null,
  rank           integer not null,
  wrestler_name  text    not null,
  athlete_id     uuid references public.athletes(id) on delete set null,
  school         text,
  weight_class   text,
  grade          text,
  classification text,
  region         text,
  record         text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One rank per wrestler per edition; re-importing the same paste updates rather than duplicates.
create unique index if not exists rankwrestler_rankings_unique
  on public.rankwrestler_rankings (class_year, edition, wrestler_name);

create index if not exists rankwrestler_rankings_athlete
  on public.rankwrestler_rankings (athlete_id);

create index if not exists rankwrestler_rankings_lookup
  on public.rankwrestler_rankings (class_year, edition desc, rank);
