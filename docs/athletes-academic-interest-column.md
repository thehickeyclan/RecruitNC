# Athletes table – academic_interest column

The unified athlete profile and inline Academics editor now support **academic interest** (intended major for college). The Blue express-interest form and athlete profile submissions also use this field.

## Column: `athletes.academic_interest`

Add this column in the Supabase SQL editor if it does not exist:

```sql
alter table public.athletes add column if not exists academic_interest text;
```

Run this once. `add column if not exists` is safe to run even if the column already exists.
