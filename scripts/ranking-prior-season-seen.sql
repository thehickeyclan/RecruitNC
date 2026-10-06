-- Record that an outlet's newest list is last season's, without storing the list.
--
-- A rejected prior-season edition left no trace but a last_checked_at, so an outlet sitting on
-- last season's final and an outlet that has published nothing at all were the same empty row -
-- and the daily report said "no new edition ever" for both. Flo's girls list is the first: their
-- newest is the 2025-26 final, which ranks wrestlers who have since graduated.
--
-- The rows themselves stay out on purpose. Five stars are gated on holding a matched ranking row
-- at all, so storing last season's final would hand a current five star to a graduate.
--
-- Run once in the Supabase SQL editor (safe to re-run).

ALTER TABLE ranking_source_status
  ADD COLUMN IF NOT EXISTS prior_season_published date;
ALTER TABLE ranking_source_status
  ADD COLUMN IF NOT EXISTS prior_season_url text;
