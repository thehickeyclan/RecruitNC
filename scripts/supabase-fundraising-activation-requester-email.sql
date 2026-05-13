-- Denormalize requester email on activation requests (staff review). Run in Supabase SQL Editor.

alter table public.fundraising_activation_requests
  add column if not exists requester_email text;

comment on column public.fundraising_activation_requests.requester_email is
  'Auth user email at request time (optional; for staff to verify family association before approve).';
