# user_profiles: Add location and bio

The Profile page ("My Profile") lets users edit **location** and **bio**. Those fields are only saved if the `user_profiles` table has matching columns.

Run this in **Supabase → SQL Editor** if you want profile updates to include location and bio:

```sql
alter table public.user_profiles
  add column if not exists location text,
  add column if not exists bio text;
```

After this, **Save Changes** on the profile form will persist name, cell_phone, location, and bio.
