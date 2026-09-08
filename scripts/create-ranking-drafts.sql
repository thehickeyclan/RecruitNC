-- Save-then-publish for the prospect rankings.
--
-- The board wrote `athletes.prospect_ranking` the moment you pressed the one button it had, so
-- there was no way to work on an order without it being live. A draft is the working order; a
-- publish copies it out.
--
-- `create_ranking_version` and `publish_rankings` are referenced by two API routes that have
-- never worked — neither the functions nor `ranking_versions` exist in this database. This
-- replaces the idea with two small tables.

create table if not exists public.ranking_drafts (
  class_year integer not null,
  gender     text    not null,
  athlete_id uuid    not null references public.athletes(id) on delete cascade,
  rank       integer not null check (rank >= 1),
  primary key (class_year, gender, athlete_id)
);

create index if not exists ranking_drafts_order
  on public.ranking_drafts (class_year, gender, rank);

-- One row per class and gender: when the working order was last saved, and last published.
create table if not exists public.ranking_editions (
  class_year      integer not null,
  gender          text    not null,
  draft_saved_at  timestamptz,
  draft_saved_by  uuid references auth.users(id),
  published_at    timestamptz,
  published_by    uuid references auth.users(id),
  primary key (class_year, gender)
);
