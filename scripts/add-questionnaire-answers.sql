-- Questionnaire answers: what only the family knows (date of birth, address, parents, coaches,
-- NCAA ID), typed once for every college interest form. Read and written only by the server
-- (lib/questionnaire/answers.ts): RLS on with no policies, so the browser keys see nothing.
create table if not exists public.questionnaire_answers (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.questionnaire_answers enable row level security;
revoke all on public.questionnaire_answers from anon, authenticated;

-- How each interest form was marked done: by the family on our page, or by the autofill helper
-- seeing the college's thank-you page.
alter table public.college_list_items add column if not exists questionnaire_done_via text;
