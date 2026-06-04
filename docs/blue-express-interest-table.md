# Blue Express Interest form – database table

The Blue page "State Qualifier Interest" form submits to `POST /api/blue/express-interest`, which writes to Supabase.

## Table: `blue_express_interest`

Create this table in the Supabase SQL editor if it does not exist:

```sql
create table if not exists public.blue_express_interest (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  cell_phone text not null,
  graduation_year text not null,
  highest_achievement text not null check (highest_achievement in (
    'all_american', 'state_champion', 'state_placer', 'state_qualifier', 'na'
  )),
  high_school text,
  club text,
  comments text,
  created_at timestamptz not null default now()
);

alter table public.blue_express_interest enable row level security;

create policy "Allow anonymous insert for express interest form"
  on public.blue_express_interest for insert to anon with check (true);

create policy "Service role can read all"
  on public.blue_express_interest for select to service_role using (true);

create policy "Service role can update all"
  on public.blue_express_interest for update to service_role using (true) with check (true);
```

**Status (default blank), Regional, Placement (admin dropdowns):** Status values: `text_sent`, `approved`, `invite_sent`, `registered`, `declined`.

```sql
alter table public.blue_express_interest drop constraint if exists blue_express_interest_status_check;
alter table public.blue_express_interest add constraint blue_express_interest_status_check
  check (status is null or status in ('text_sent', 'approved', 'invite_sent', 'registered', 'declined'));

alter table public.blue_express_interest
  add column if not exists parent_email text,
  add column if not exists approval_email_sent_at timestamptz;
```

**Approval email workflow:** Admin → Blue → Interest → **Send approval** (public program info only). Then **Create invite** (private register link). After payment, welcome email includes GroupMe + store discount.

```sql
alter table public.blue_express_interest
  add column if not exists regional text
  check (regional is null or regional in ('1A','2A','3A','4A','5A','6A','7A','8A'));

alter table public.blue_express_interest
  add column if not exists placement text
  check (placement is null or placement in ('1st','2nd','3rd','4th'));
```

**If status already exists with a non-null default or check:** to allow blank as default, run:

```sql
alter table public.blue_express_interest drop constraint if exists blue_express_interest_status_check;
alter table public.blue_express_interest alter column status drop default;
alter table public.blue_express_interest add constraint blue_express_interest_status_check check (status is null or status in ('text_sent', 'invite_sent', 'registered', 'declined'));
```

Form fields: first name, last name, cell, **parent/guardian email**, graduation year, highest level achievement, high school, club, freeform (comments). Optional: high school, club, comments, weight class.

If the table already exists, add the new columns:

```sql
alter table public.blue_express_interest
  add column if not exists high_school text,
  add column if not exists club text,
  add column if not exists comments text,
  add column if not exists weight_class text,
  add column if not exists status text,
  add column if not exists regional text,
  add column if not exists placement text;
-- Optional checks: status (null or text_sent/invite_sent/registered/declined), regional (null or 1A-8A), placement (null or 1st-4th). See block above.
```

**Weight class:** Run this in Supabase SQL editor if needed:

```sql
alter table public.blue_express_interest add column if not exists weight_class text;
```

Until the column exists, submissions without weight class will still work.

## Deployment (admin list shows 0 rows)

The admin page `/admin/blue/interest` reads via the **service role** client. In **Vercel → Settings → Environment Variables**, set `SUPABASE_SERVICE_ROLE_KEY` to the **service role** key from Supabase (Dashboard → Settings → API → `service_role` secret), **not** the anon key. Use the same Supabase project for Production and Preview so the table data is visible. If the key is wrong or the project differs, the API returns 0 rows and the interest page shows a hint to fix this.

**Verify after changing env vars:** Hit `GET /api/health` on your deployed URL. It returns whether Supabase is configured and the DB is reachable (no secrets in the response), so you can confirm one deploy without guessing.
