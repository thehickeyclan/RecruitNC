-- Messaging extras (15 Oct 2026): edit, unsend, reply-to, reactions, attachments, and the staff
-- audit trail behind edit and unsend. Same lockdown as scripts/add-coach-messages.sql: RLS on, no
-- policies, browser roles revoked; every read and write goes through /api/coach-messages.
--
-- Until this is run the site works as before; each extra switches on by itself once it is.
-- Safe to run more than once.

alter table public.coach_messages
  add column if not exists edited_at timestamptz,
  add column if not exists unsent_at timestamptz,
  add column if not exists reply_to_id uuid references public.coach_messages (id) on delete set null,
  add column if not exists attachment jsonb;

-- What a message said before it was edited or unsent. Staff only. No foreign keys, so the record
-- outlives the message, the thread and the account.
create table if not exists public.coach_message_edits (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  thread_id uuid not null,
  editor_user_id uuid,
  action text not null check (action in ('edit', 'unsend')),
  previous_body text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_message_edits_message_idx on public.coach_message_edits (message_id, created_at);

create table if not exists public.coach_message_reactions (
  message_id uuid not null references public.coach_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '🔥', '💪', '👏', '🙏')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.coach_message_edits enable row level security;
alter table public.coach_message_reactions enable row level security;
revoke all on public.coach_message_edits, public.coach_message_reactions from anon, authenticated;

-- Attachments: a private bucket, 10 MB, PDFs and photos. Files are only handed out as short-lived
-- signed links to people in the conversation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-message-files', 'coach-message-files', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
