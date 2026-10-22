-- The admissions track on each saved college (Matt, 22 Oct 2026: "did I apply and what is the
-- status?"). Separate from the recruiting stage: a wrestler can be talking to the coach and not
-- have applied, or be admitted while the coach has gone quiet.
--
-- Safe to run more than once.

alter table public.college_list_items
  add column if not exists app_plan text check (app_plan is null or app_plan in ('ed1', 'ed2', 'ea', 'rea', 'rd', 'rolling')),
  add column if not exists app_status text check (app_status is null or app_status in ('planning', 'submitted', 'admitted', 'deferred', 'waitlisted', 'denied', 'withdrawn')),
  add column if not exists app_submitted_on date,
  add column if not exists preread text check (preread is null or preread in ('requested', 'likely', 'possible', 'unlikely'));
