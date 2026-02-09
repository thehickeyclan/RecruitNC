# Colleges table migration: single name + division per college

Run these in **Supabase SQL Editor** in order. This creates the `colleges` table, adds `college_id` to athletes, backfills from existing `athletes.college`, and aligns each athlete to one college row.

---

## Step 1: Create `colleges` table

```sql
-- Single source of truth for college name and division.
-- Every athlete with a commitment links here via college_id.
CREATE TABLE IF NOT EXISTS colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  division text NOT NULL DEFAULT '',
  logo_url text,
  slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges (name);
CREATE INDEX IF NOT EXISTS idx_colleges_slug ON colleges (slug) WHERE slug IS NOT NULL;
COMMENT ON TABLE colleges IS 'Canonical college list; one row per school. Name and division are the single source of truth.';
```

---

## Step 2: Add `college_id` to `athletes`

```sql
-- Link each athlete to a college row (nullable for prospects).
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES colleges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_athletes_college_id ON athletes (college_id) WHERE college_id IS NOT NULL;
```

---

## Step 3: Backfill `colleges` from distinct `athletes.college`

This inserts one row per distinct non-empty `athletes.college` value. The **name** stored is the value as it appears in the DB (we'll use this as the canonical name for now; you can normalize/merge later in admin).

```sql
-- Insert one college per distinct athlete.college (trimmed, non-empty).
INSERT INTO colleges (name, division, updated_at)
SELECT DISTINCT
  trim(athletes.college) AS name,
  '' AS division,
  now() AS updated_at
FROM athletes
WHERE athletes.college IS NOT NULL
  AND trim(athletes.college) <> ''
ON CONFLICT (name) DO NOTHING;
```

---

## Step 4: Set `athletes.college_id` from matching `colleges.name`

```sql
-- Point each athlete at the college row whose name matches their college field.
UPDATE athletes a
SET college_id = c.id
FROM colleges c
WHERE a.college IS NOT NULL
  AND trim(a.college) <> ''
  AND trim(a.college) = c.name;
```

---

## Step 5: Verify (optional, read-only — safe to run)

Run these checks to confirm the backfill worked. They do not change any data.

```sql
-- Count athletes with college but no college_id (should be 0 after step 4).
SELECT count(*) AS athletes_with_college_no_id
FROM athletes
WHERE college IS NOT NULL AND trim(college) <> '' AND college_id IS NULL;

-- Count colleges and athletes linked.
SELECT
  (SELECT count(*) FROM colleges) AS colleges_count,
  (SELECT count(*) FROM athletes WHERE college_id IS NOT NULL) AS athletes_with_college_id;
```

---

## Step 6 (after app uses `college_id` everywhere): Drop legacy column

**Do not run until the app reads/writes `college_id` and displays college name/division from the `colleges` table.**

```sql
ALTER TABLE athletes DROP COLUMN IF EXISTS college;
```

---

## Division alignment

- **colleges.division** is a single text value per college (e.g. `"NCAA Division II"`). It starts as `''` after backfill.
- **Where to set divisions:** Admin → **Colleges (divisions)** (`/admin/colleges`). That page lists all rows from the `colleges` table; use the dropdown per row to set division. The app shows `colleges.division` everywhere.
- Optional: run a one-time update from a spreadsheet or list of (college name, division) if you have one.
