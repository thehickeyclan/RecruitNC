# Merge duplicate athlete profiles

Superseded by `scripts/merge-duplicate-athletes.ts`. **Do not hand-write a merge from a table
list.** The previous version of this file listed seven tables to repoint; fifty-three carry an
`athlete_id`, and `toc_invitations` — which holds a wrestler's paid Tournament of Champions
registration, seed and acknowledgments — was not among them. Following it would have destroyed a
registration.

```bash
# What would change, and every field where the two rows disagree
npx tsx --env-file=.env.local scripts/merge-duplicate-athletes.ts

# The SQL, once the plan reads correctly
npx tsx --env-file=.env.local scripts/merge-duplicate-athletes.ts --sql
```

Paste the SQL into the Supabase SQL editor. It is wrapped in a transaction.

## What it does

Groups athletes on **first name, last name and graduation year**, so `AMANUEL KAHSAI` and
`Amanuel “Manny” Kahsai` meet while two genuinely different wrestlers who share a surname do not.

For each group it picks the row holding the most information — filled fields, imported matches, a
claim, verification — then:

1. Fills the survivor's empty columns from the duplicates, so a GPA on one row and a phone on the
   other both live.
2. Repoints all fifty-three referencing columns, read from the live PostgREST schema each run so
   the list cannot go stale again.
3. Deletes the duplicate rows.

A Tournament of Champions invitation is deliberately **not** scored. The invitation is repointed
either way, so weighting it once kept an empty profile over the one holding the athlete's 37 bouts.

## Read the conflicts before running

Everything except a conflict survives. A `CONFLICT` line is a column where both rows hold a
different value and one is about to be dropped — the only place information is actually lost.

Two are resolved automatically: a `true` flag beats `false` (these are "this happened" markers,
and the event does not un-happen), and a real `ncUnitedTeam` beats `"none"` (the Blue signup
created several of these duplicates, so the newer row is the one that knows).

Everything else is printed for a person. Watch for:

- **`prospect_ranking`** — a duplicate occupies two slots in a class at once (Lemke was 74 *and*
  75). Deleting one frees a slot and shifts everyone below it. Re-run the rankings afterwards.
- **`contactEmail`** — one row may carry a school staff address and the other the family's.
- **`name`** — casing and nicknames differ; pick the one you want shown publicly.

## Afterwards

- Open the surviving profile and confirm results, matches and any TOC registration are intact.
- Re-check `/rankings` for the freed slots.
- The old id 404s, which is expected.
