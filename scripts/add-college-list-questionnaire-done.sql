-- The interest form (recruiting questionnaire) as its own check on each saved college
-- (Matt, 22 Oct 2026). It was a stage between Interested and Contacted, so a family who emailed a
-- coach before filling out the form had nowhere to record it but the note: Jake Amiott's list
-- had six colleges at "Emailed the coach" with "Need to fill out interest form" in the note.
--
-- Safe to run more than once. Rows already at the old "Questionnaire sent" stage count as done.

alter table public.college_list_items add column if not exists questionnaire_done_at timestamptz;

update public.college_list_items
set questionnaire_done_at = updated_at
where status = 'questionnaire' and questionnaire_done_at is null;
