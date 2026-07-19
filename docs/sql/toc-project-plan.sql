-- Tournament of Champions project plan
-- Run in Supabase SQL Editor.

create table if not exists public.toc_project_tasks (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  sort_order integer not null default 0,
  budget_amount numeric(12,2),
  actual_amount numeric(12,2),
  due_date date,
  delivery_date date,
  notes text,
  assignees jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.toc_project_tasks
  add column if not exists comments jsonb not null default '[]'::jsonb;

alter table public.toc_project_tasks
  add column if not exists delivery_date date;

create index if not exists toc_project_tasks_category_idx on public.toc_project_tasks (category, sort_order);
create index if not exists toc_project_tasks_status_idx on public.toc_project_tasks (status);
create index if not exists toc_project_tasks_updated_at_idx on public.toc_project_tasks (updated_at desc);
create unique index if not exists toc_project_tasks_category_title_key
  on public.toc_project_tasks (category, title);

create table if not exists public.toc_project_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  vendor text,
  document_date date,
  description text,
  amount numeric(12,2),
  ai_summary text,
  ai_metadata jsonb,
  ai_review_status text,
  ai_reviewed_at timestamptz,
  url text not null,
  path text,
  file_name text not null,
  file_type text,
  file_size bigint,
  uploaded_by text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.toc_project_documents
  add column if not exists vendor text;

alter table public.toc_project_documents
  add column if not exists document_date date;

alter table public.toc_project_documents
  add column if not exists ai_summary text;

alter table public.toc_project_documents
  add column if not exists ai_metadata jsonb;

alter table public.toc_project_documents
  add column if not exists ai_review_status text;

alter table public.toc_project_documents
  add column if not exists ai_reviewed_at timestamptz;

alter table public.toc_project_documents
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.toc_project_chat_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) > 0),
  author_email text not null,
  author_user_id uuid,
  mentions jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '[]'::jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.toc_project_chat_messages
  add column if not exists mentions jsonb not null default '[]'::jsonb;

alter table public.toc_project_chat_messages
  add column if not exists reactions jsonb not null default '[]'::jsonb;

alter table public.toc_project_chat_messages
  add column if not exists edited_at timestamptz;

alter table public.toc_project_chat_messages
  add column if not exists deleted_at timestamptz;

create table if not exists public.toc_project_typing_status (
  email text primary key,
  user_id uuid,
  name text,
  is_typing boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.toc_project_activity (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  task_id uuid,
  task_title text,
  category text,
  actor_email text not null,
  actor_user_id uuid,
  summary text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.toc_project_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.toc_project_tasks(id) on delete set null,
  task_title text,
  category text,
  title text not null,
  body text,
  vendor text,
  amount numeric(12,2),
  needed_by date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  response_note text,
  attachments jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  requested_by_email text not null,
  requested_by_user_id uuid,
  decided_by_email text,
  decided_by_user_id uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists toc_project_documents_created_at_idx
  on public.toc_project_documents (created_at desc);
create index if not exists toc_project_documents_category_idx
  on public.toc_project_documents (category);
create index if not exists toc_project_documents_vendor_idx
  on public.toc_project_documents (vendor);
create index if not exists toc_project_documents_document_date_idx
  on public.toc_project_documents (document_date desc);
create index if not exists toc_project_documents_ai_review_status_idx
  on public.toc_project_documents (ai_review_status);
create index if not exists toc_project_chat_messages_created_at_idx
  on public.toc_project_chat_messages (created_at desc);
create index if not exists toc_project_typing_status_updated_at_idx
  on public.toc_project_typing_status (updated_at desc);
create index if not exists toc_project_activity_created_at_idx
  on public.toc_project_activity (created_at desc);
create index if not exists toc_project_activity_task_id_idx
  on public.toc_project_activity (task_id);
create index if not exists toc_project_approvals_created_at_idx
  on public.toc_project_approvals (created_at desc);
create index if not exists toc_project_approvals_status_idx
  on public.toc_project_approvals (status);
create index if not exists toc_project_approvals_task_id_idx
  on public.toc_project_approvals (task_id);

alter table public.toc_project_documents enable row level security;
alter table public.toc_project_chat_messages enable row level security;
alter table public.toc_project_typing_status enable row level security;
alter table public.toc_project_activity enable row level security;
alter table public.toc_project_approvals enable row level security;

drop policy if exists "Service role manages TOC project documents" on public.toc_project_documents;
create policy "Service role manages TOC project documents"
  on public.toc_project_documents
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages TOC project chat messages" on public.toc_project_chat_messages;
create policy "Service role manages TOC project chat messages"
  on public.toc_project_chat_messages
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages TOC project typing status" on public.toc_project_typing_status;
create policy "Service role manages TOC project typing status"
  on public.toc_project_typing_status
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages TOC project activity" on public.toc_project_activity;
create policy "Service role manages TOC project activity"
  on public.toc_project_activity
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages TOC project approvals" on public.toc_project_approvals;
create policy "Service role manages TOC project approvals"
  on public.toc_project_approvals
  for all
  to service_role
  using (true)
  with check (true);

alter table public.toc_project_tasks enable row level security;

drop policy if exists "Service role manages TOC project tasks" on public.toc_project_tasks;
create policy "Service role manages TOC project tasks"
  on public.toc_project_tasks
  for all
  to service_role
  using (true)
  with check (true);

-- Optional public bucket for uploaded contracts, docs, art proofs, floorplans, etc.
-- The API will also attempt to create it automatically with service role.
insert into storage.buckets (id, name, public)
values ('toc-project-attachments', 'toc-project-attachments', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('toc-project-documents', 'toc-project-documents', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read TOC project attachments" on storage.objects;
create policy "Public read TOC project attachments"
  on storage.objects
  for select
  using (bucket_id = 'toc-project-attachments');

drop policy if exists "Public read TOC project documents" on storage.objects;
create policy "Public read TOC project documents"
  on storage.objects
  for select
  using (bucket_id = 'toc-project-documents');

drop policy if exists "Service role manages TOC project attachments" on storage.objects;
create policy "Service role manages TOC project attachments"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'toc-project-attachments')
  with check (bucket_id = 'toc-project-attachments');

drop policy if exists "Service role manages TOC project documents" on storage.objects;
create policy "Service role manages TOC project documents"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'toc-project-documents')
  with check (bucket_id = 'toc-project-documents');

insert into public.toc_project_tasks (category, title, priority, sort_order)
values
('Venue & Operations', 'Negotiate & sign venue contract', 'high', 10),
('Venue & Operations', 'Hire Tournament Operations Director', 'normal', 20),
('Venue & Operations', 'Order wrestling mats', 'normal', 30),
('Venue & Operations', 'Secure scales', 'normal', 40),
('Venue & Operations', 'Hire officials', 'normal', 50),
('Venue & Operations', 'Hire athletic trainer / medical staff', 'normal', 60),
('Venue & Operations', 'Recruit setup & teardown volunteers (mats, taping, venue setup)', 'normal', 70),
('Venue & Operations', 'Recruit table workers', 'normal', 80),
('Venue & Operations', 'Recruit general event volunteers', 'normal', 90),
('Venue & Operations', 'Plan VIP Lounge', 'normal', 100),
('Competition', 'Select & invite Top 88 wrestlers', 'high', 110),
('Competition', 'Finalize 11 brackets', 'normal', 120),
('Competition', 'Select bracketing platform (Trackwrestling or FloArena)', 'normal', 130),
('Awards & Apparel', 'Design & order Tournament of Champions jackets', 'normal', 140),
('Awards & Apparel', 'Order medals', 'normal', 150),
('Awards & Apparel', 'Order championship hammers', 'normal', 160),
('Awards & Apparel', 'Finalize event apparel', 'normal', 170),
('Branding & Signage', 'Design & print event posters', 'normal', 180),
('Branding & Signage', 'Design venue signage & directional signs', 'normal', 190),
('Branding & Signage', 'Produce sponsor signage', 'normal', 200),
('Branding & Signage', 'Order NC United tablecloths', 'normal', 210),
('Branding & Signage', 'Order Wrestling Guild tablecloths', 'normal', 220),
('Branding & Signage', 'Design recruiting/vendor booth displays', 'normal', 230),
('Fan Experience', 'Secure ticketing vendor', 'normal', 240),
('Fan Experience', 'Order access wristbands (by attendee type)', 'normal', 250),
('Fan Experience', 'Finalize concessions & food vendors', 'normal', 260),
('Fan Experience', 'Secure FloWrestling streaming', 'normal', 270),
('Fan Experience', 'Confirm commentators', 'normal', 280),
('Fan Experience', 'Identify Master of Ceremonies (MC)', 'normal', 290),
('Fan Experience', 'National Anthem', 'normal', 300),
('Fan Experience', 'Opening Prayer', 'normal', 310),
('Fan Experience', 'Plan Parade of Champions', 'normal', 320),
('Recruiting', 'Recruit college coaches', 'normal', 330),
('Recruiting', 'Organize Coaches Lounge / VIP area', 'normal', 340),
('Marketing', 'Launch Tournament website & registration portal', 'normal', 350),
('Marketing', 'Build all online forms', 'normal', 360),
('Marketing', 'Launch social media campaign', 'normal', 370),
('Marketing', 'Secure sponsors', 'high', 380),
('Special Events', 'Plan Wrestlers in Business Network event', 'normal', 390),
('Special Events', 'Organize Caden Perry Scholarship presentation', 'normal', 400)
on conflict (category, title) do nothing;

notify pgrst, 'reload schema';
