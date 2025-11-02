# Launch Stabilization (No Code Changes)

Use this checklist to stabilize admin flows today without touching the app code.

1) Refresh server cookies once
- Sign out → Sign in again on the same domain (no subdomain hop).
- Hard refresh the page (Shift+Reload).
- Verify server session: open /api/debug/auth-status — it should show you as authenticated.

2) Add missing DB columns (safe to re-run)
Run these SQL statements in your database console (Supabase SQL Editor or Neon console).
They only add columns if they don’t exist.

-- Edit requests
ALTER TABLE public.edit_requests
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Athlete confirmations
ALTER TABLE public.athlete_confirmations
  ADD COLUMN IF NOT EXISTS is_confirmed boolean,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS confirmation_method text;

-- Athletes (approval flow)
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS commitment_approved boolean,
  ADD COLUMN IF NOT EXISTS commitment_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS commitment_approved_by uuid;

3) Verify columns exist
SELECT column_name FROM information_schema.columns WHERE table_name = 'edit_requests';
SELECT column_name FROM information_schema.columns WHERE table_name = 'athlete_confirmations';
SELECT column_name FROM information_schema.columns WHERE table_name = 'athletes';

4) Re-test launch flows
- Visit /admin/edit-requests — both tabs should load without “column does not exist” errors.
- Try approving a profile again.

5) If you still hit “Unauthorized” in an admin API
- It’s either a server-session visibility issue or RLS.
- Quick workaround:
  - Re-login and hard refresh once more.
  - If urgent, temporarily relax the specific table’s policy to allow authenticated users for write during launch, then revert immediately after.

Notes
- No application code changes are required for the above.
- All SQL is idempotent and safe to re-run.
- Post-launch, we can simplify auth to a single server-side gate in the admin layout if you want, with zero middleware.
