Public Athlete Profile: What to query and how to link

If you want your separate project (sharing the same DB) to open the public profile you see here, use the athlete's id from the athletes table and link to:
- https://app.ncwrestlingunited.com/athletes/{id}

Primary tables used by the profile page
- athletes (primary source of truth for each profile)
  - Key columns commonly used in the card/profile:
    - id (primary key to link the public page)
    - name
    - high_school
    - club
    - college
    - graduation_year
    - weight_class
    - gender
    - commitment_date
    - image_url
    - division
- matches (optional, shown in the profile under Match Data)
  - Filter with: athlete_id = athletes.id
  - Order: created_at DESC

Linking from your other project (recommended)
- Fetch a list from athletes and when a user selects one, send them to:
  - https://YOUR_DOMAIN/athletes/{id}
- This is the canonical route this portal uses to render the athlete’s public profile.

Example SQL search (server-side)
SELECT
  id, name, image_url, college, high_school, graduation_year, division, weight_class, gender
FROM athletes
WHERE
  name ILIKE '%' || :q || '%'
  OR high_school ILIKE '%' || :q || '%'
  OR college ILIKE '%' || :q || '%'
  OR club ILIKE '%' || :q || '%'
ORDER BY created_at DESC;

Notes
- The public profile page does not require auth.
- If you also want to show match history in your other project, query matches where matches.athlete_id = athletes.id.
- If you already have a “slug” system in your other project, prefer using id to avoid ambiguity. This portal’s canonical route is /athletes/{id}.

Optional API routes (if you prefer HTTP over direct DB)
- GET /api/athletes (list)
- GET /api/athletes/{id} (single)
- GET /api/athletes/{id}/matches (matches)

These route handlers read from the same athletes and matches tables and return JSON ready to consume.
