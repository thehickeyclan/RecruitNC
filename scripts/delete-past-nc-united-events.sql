-- NC United calendar: delete events that have already ended.
-- Linked rows in drop_in_requests are removed automatically (ON DELETE CASCADE).
--
-- "Today" uses America/New_York so it matches NC United local calendar days.

-- Preview:
-- SELECT id, title, start_date, end_date
-- FROM public.events
-- WHERE COALESCE(end_date, start_date) < (NOW() AT TIME ZONE 'America/New_York')::date
-- ORDER BY start_date;

DELETE FROM public.events
WHERE COALESCE(end_date, start_date) < (NOW() AT TIME ZONE 'America/New_York')::date;
