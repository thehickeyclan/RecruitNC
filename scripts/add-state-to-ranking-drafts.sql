-- A saved board order belongs to a state as well as a class and gender (18 October 2026).
--
-- South Carolina's men's boards are worked on the same admin board as North Carolina's. Both
-- tables were keyed on class year and gender alone, and saving replaces the whole draft for that
-- key, so saving the SC Class of 2027 would have deleted North Carolina's 2027 draft.
--
-- Every existing row is North Carolina's, so the column defaults to 'NC' and nothing about the
-- NC boards changes. Run this before the code that reads `state` is deployed.

alter table public.ranking_drafts   add column if not exists state text not null default 'NC';
alter table public.ranking_editions add column if not exists state text not null default 'NC';

alter table public.ranking_drafts drop constraint if exists ranking_drafts_pkey;
alter table public.ranking_drafts add primary key (class_year, gender, state, athlete_id);

alter table public.ranking_editions drop constraint if exists ranking_editions_pkey;
alter table public.ranking_editions add primary key (class_year, gender, state);

drop index if exists public.ranking_drafts_order;
create index if not exists ranking_drafts_order
  on public.ranking_drafts (class_year, gender, state, rank);
