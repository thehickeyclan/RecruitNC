-- Tournament of Champions field alerts for the iOS app.
--
-- A device opts in to each alert kind with its own column, matching alert_commits /
-- alert_rankings / alert_events. This one defaults TRUE: the reveal cadence is the reason
-- someone installs the app during the run-up to September, so a device that never opens
-- More still hears about a weight going live. The others default per their own product call
-- and are untouched here.
--
-- Safe to run more than once.

alter table public.push_devices
  add column if not exists alert_toc boolean not null default true;

comment on column public.push_devices.alert_toc is
  'Send this device a push when a TOC weight class is released publicly (toc_field_publication_status.announced_at set).';

-- Existing devices registered before this column existed should hear about reveals too —
-- they installed for wrestling news, and the default above only applies to new rows.
update public.push_devices
set alert_toc = true
where alert_toc is null;

-- The send path filters on this column, so it is worth an index once the table is large.
create index if not exists push_devices_alert_toc_idx
  on public.push_devices (alert_toc)
  where alert_toc = true;
