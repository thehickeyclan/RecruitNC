# Page content table (Blue page banner)

The Blue page banner URL is stored in Supabase so admins can change it from **Admin → Blue** without editing code.

## One-time setup

Run this in the Supabase SQL editor (Dashboard → SQL Editor):

```sql
-- Key-value store for page content (e.g. Blue page banner)
create table if not exists page_content (
  key   text primary key,
  value text
);

-- Optional: restrict writes to backend only; allow public read for banner
-- alter table page_content enable row level security (RLS);
-- create policy "Public read" on page_content for select using (true);
-- create policy "Service role write" on page_content for all using (auth.role() = 'service_role');
```

After this, use **Admin → Blue** to upload and set the Blue page banner.
