-- Add transfer history on athletes (current college stays in `college`).
-- Run in Supabase SQL Editor.

alter table public.athletes
  add column if not exists previous_college text;

comment on column public.athletes.previous_college is
  'Prior college when athlete transferred (e.g. UNC Chapel Hill before NC State). Current school remains athletes.college.';

create index if not exists idx_athletes_previous_college
  on public.athletes (previous_college)
  where previous_college is not null and previous_college <> '';
