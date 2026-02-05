# Class of 2028: Show ranking on profile and athlete list

The 2028 rankings **page** uses a static list (`top20Data`) for the table, but:
- **Unified profile** shows rank only when the athlete row has `prospect_ranking` set (1–20 for 2028).
- **Athlete profiles list** (`/prospects/all`) and the rankings API use `prospect_ranking` for ordering and display.

So if Luke Richards (or any 2028 athlete) has `prospect_ranking = null` in the DB, their rank will not show on their profile or on the list.

## Fix: set prospect_ranking in the database

Run the following in **Supabase → SQL Editor**. It updates by name + high school + graduation year so the right row is updated.

```sql
-- Class of 2028: set prospect_ranking so rank shows on profile and list
-- Match by name and high school (graduationyear = 2028)

UPDATE athletes SET prospect_ranking = 1
WHERE graduationyear = 2028 AND name ILIKE '%Aaron Ellison%' AND (highschool ILIKE '%Lumberton%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 2
WHERE graduationyear = 2028 AND name ILIKE '%Connor Reece%' AND (highschool ILIKE '%Northwest Guilford%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 3
WHERE graduationyear = 2028 AND name ILIKE '%Ryan Thompson%' AND (highschool ILIKE '%Cardinal Gibbons%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 4
WHERE graduationyear = 2028 AND name ILIKE '%Hayden Smith%' AND (highschool ILIKE '%White Oak%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 5
WHERE graduationyear = 2028 AND name ILIKE '%Jacob Perry%' AND (highschool ILIKE '%New Bern%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 6
WHERE graduationyear = 2028 AND name ILIKE '%Mitchell Rowland%' AND (highschool ILIKE '%Pinecrest%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 7
WHERE graduationyear = 2028 AND name ILIKE '%Luke Richards%' AND (highschool ILIKE '%Cardinal Gibbons%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 8
WHERE graduationyear = 2028 AND name ILIKE '%Jake Amiott%' AND (highschool ILIKE '%Topsail%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 9
WHERE graduationyear = 2028 AND (name ILIKE '%Jackson D''Ettore%' OR name ILIKE '%Jackson D%Ettore%') AND (highschool ILIKE '%Charlotte Catholic%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 10
WHERE graduationyear = 2028 AND name ILIKE '%Drew Teeter%' AND (highschool ILIKE '%Mooresville%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 11
WHERE graduationyear = 2028 AND name ILIKE '%Aaron Ruiz%' AND (highschool ILIKE '%Mount Airy%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 12
WHERE graduationyear = 2028 AND name ILIKE '%Stephen Cross%' AND (highschool ILIKE '%Trinity%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 13
WHERE graduationyear = 2028 AND name ILIKE '%Adrian Feliciano%' AND (highschool ILIKE '%Hough%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 14
WHERE graduationyear = 2028 AND name ILIKE '%Christian Riddick%' AND (highschool ILIKE '%First Flight%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 15
WHERE graduationyear = 2028 AND name ILIKE '%Joseph Shook%' AND (highschool ILIKE '%Union Pines%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 16
WHERE graduationyear = 2028 AND name ILIKE '%Matthew Akins%' AND (highschool ILIKE '%Pinecrest%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 17
WHERE graduationyear = 2028 AND name ILIKE '%Paxton Kearns%' AND (highschool ILIKE '%Uwharrie%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 18
WHERE graduationyear = 2028 AND name ILIKE '%Sheppard Homan%' AND (highschool ILIKE '%Enka%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 19
WHERE graduationyear = 2028 AND name ILIKE '%Caleb Edwards%' AND (highschool ILIKE '%Piedmont%' OR highschool IS NULL);

UPDATE athletes SET prospect_ranking = 20
WHERE graduationyear = 2028 AND name ILIKE '%Vincent Grack%' AND (highschool ILIKE '%Hough%' OR highschool IS NULL);
```

After this:
- Each athlete’s **unified profile** will show their rank (e.g. #7 for Luke).
- The **athlete profiles list** will show them with rank and in the correct order.
- The **2028 rankings API** will include them so the rankings table/card view stays in sync.

## Optional: direct profile links from 2028 page

If “View Profile” for someone (e.g. Luke) still goes to by-name instead of the direct ID, add their athlete `id` to `PROFILE_IDS_2028` in `app/public-rankings/2028/page.tsx`. Get the ID from Supabase: `SELECT id, name, highschool FROM athletes WHERE graduationyear = 2028 AND name ILIKE '%Luke Richards%';`
