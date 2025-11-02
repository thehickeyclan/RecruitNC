# Where to update college divisions

Use one place as the source of truth: the `logo_mappings` table (rows with `entity_type = 'college'`).

## Option A — Supabase Table Editor (recommended)
1. Open your Supabase project.
2. Go to: Table editor → `logo_mappings`.
3. Filter the rows: `entity_type = 'college'`.
4. For each college, update:
   - `division` to your canonical value (e.g., "NCAA Division I", "NCAA Division II", "NCAA Division III", "NAIA", "NJCAA").
   - `aliases` (comma-separated) for common name variations to improve matching.
5. Changes save immediately.

If any features depend on `athletes.division`, run the sync script in the Supabase SQL Editor:
- `scripts/sync-athlete-divisions-from-logo-mappings.sql` (full overwrite), or
- `scripts/sync-athlete-divisions-only-null.sql` (only fills missing).

## Option B — Existing in‑app pages (for search/visibility)
- `/admin/logo-mappings`
- `/admin/enhanced-logo-manager`

These are useful to search, preview, and manage mappings/logos, but they do not currently expose the `division` field. Make division edits in Supabase (Option A) for now.

## After you edit
- Reads from `logo_mappings` reflect instantly.
- If a view uses `athletes.division`, run the sync SQL once to propagate the latest values into athlete rows.
