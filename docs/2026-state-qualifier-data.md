# 2026 State Qualifier Data — For RecruitNC

## Summary (for RecruitNC)

- **Where:** All 2026 NCHSAA state qualifiers (and placers) are stored in the **Supabase table `wrestling_nchsaa_results`** — same DB as LegacyNC. This is the only source for state/SQ on unified profiles.
- **How we store 2026 SQ:** One row per wrestler. For **state qualifiers who did not place**, we set **`place = 0`** (displayed as "SQ"). For **placers**, we set **`place = 1`** (1st) through **`place = 4`** (4th). 2026 has only 4 placers per weight; 2025 and earlier used 1–8.
- **Key columns:** `year` (2026), `classification` (e.g. `4A`, `6A`, `1A/2A`), `weight_class` (e.g. `106`), `place` (0 = SQ, 1–4 = placer), `wrestler_name`, `school`. Optional: `qualifying_tournament`, `qualifying_place` (regional info).
- **Men's 2026 classifications:** `1A/2A`, `3A`, `4A`, `5A`, `6A`, `7A`, `8A`. Women's (if loaded): `1-4A`.
- **To get 2026 state qualifiers only:** Query `wrestling_nchsaa_results` with `year = 2026` and `place = 0`, and for men filter `classification` to the seven men's values above. Match to your athletes by `wrestler_name` (LegacyNC normalizes "First Last" and "Last, First" as the same person).

---

## Where it's stored

**Supabase table:** `wrestling_nchsaa_results`

This is the single source of truth for NCHSAA state results (placers and state qualifiers). LegacyNC and RecruitNC unified athlete profiles both use this table only for state/SQ info.

---

## Table schema (relevant columns)

| Column               | Type    | Description |
|----------------------|---------|-------------|
| `year`               | integer | e.g. 2026   |
| `classification`     | text    | Men: `1A/2A`, `3A`, `4A`, `5A`, `6A`, `7A`, `8A`. Women: `1-4A` |
| `weight_class`       | text    | e.g. `106`, `113`, `120`, … |
| `place`              | integer | **0 = State Qualifier (SQ)** (state qualified; did not place). **2026+**: 1–4 = placers. **2025 and earlier**: 1–8 = placers. |
| `wrestler_name`      | text    | Full name (often stored as "Last, First") |
| `school`             | text    | High school name |
| `qualifying_tournament` | text | Optional; regional identifier |
| `qualifying_place`   | integer | Optional; place at regional (1–4) |

---

## 2026 state qualifiers only (SQ)

**Men's 2026 SQ** (place = 0, 7 men's classifications):

```sql
SELECT year, classification, weight_class, place, wrestler_name, school,
       qualifying_tournament, qualifying_place
FROM wrestling_nchsaa_results
WHERE year = 2026
  AND place = 0
  AND classification IN ('1A/2A','3A','4A','5A','6A','7A','8A')
ORDER BY classification, weight_class, wrestler_name;
```

**Women's 2026 SQ** (if you load 1-4A qualifiers):

```sql
SELECT year, classification, weight_class, place, wrestler_name, school
FROM wrestling_nchsaa_results
WHERE year = 2026
  AND place = 0
  AND classification = '1-4A'
ORDER BY weight_class, wrestler_name;
```

**All 2026 (SQ + placers):**

```sql
SELECT year, classification, weight_class, place, wrestler_name, school
FROM wrestling_nchsaa_results
WHERE year = 2026
ORDER BY classification, weight_class, place, wrestler_name;
```

---

## Access

- **Database:** Same Supabase project as LegacyNC.
- **API:** RecruitNC can query `wrestling_nchsaa_results` via Supabase client (same pattern as LegacyNC athletes page: filter by `year`, `place`, `classification`; match to athletes by `wrestler_name`).
- **Matching names:** LegacyNC matches "First Last" and "Last, First" when merging NCHSAA rows to athlete profiles; RecruitNC may want the same normalization for display/merge.

---

## Blue members – 2026 NCHSAA placement (where to find each stat)

RecruitNC's "Blue members – 2026 NCHSAA placement" dashboard should use the following. **Blue members** = your own list (active subscription or athlete Blue flag); NCHSAA stats come from the shared DB.

| Stat | Where to get it |
|------|------------------|
| **Total Blue members** | RecruitNC: count athletes with active subscription or Blue flag (your app/DB). |
| **2026 State champs** | `wrestling_nchsaa_results`: `year = 2026` and `place = 1`. Join/match to your Blue members by `wrestler_name` (support "Last, First" and "First Last"). |
| **2026 State placers** | Same table: `year = 2026` and `place IN (1,2,3,4)`. Count distinct Blue members who have at least one such row. |
| **2026 State qualifiers (SQ)** | Same table: `year = 2026` and `place = 0`, and for men `classification IN ('1A/2A','3A','4A','5A','6A','7A','8A')`. Count distinct Blue members who have at least one such row. |
| **2× / 3× / 4× State champs** | `wrestling_nchsaa_results`: count how many times each athlete has `place = 1` (any year). Then among Blue members, count those with 2, 3, or 4 state titles. |
| **All-Americans** | `wrestling_nhsca_results`: placement 1–8 = All-American. Filter by your Blue members (match `athlete_name` to your athletes); count distinct Blue members with at least one such row. |

**Single source for 2026 NCHSAA:** Supabase table **`wrestling_nchsaa_results`** (same project as LegacyNC). Match to your athletes by normalizing names (e.g. "Last, First" ↔ "First Last") when joining to your Blue member list.

### If the list shows SQ but the kid actually placed 2nd / 3rd / 4th

The app only reads from the DB. If the row in `wrestling_nchsaa_results` has **place = 0** (SQ) and no placer row exists, we show SQ. Fix the data:

- **Option A (admin API):** `POST /api/admin/blue/nchsaa-2026-place` with body:
  `{ "wrestler_name": "Aaron Ellison", "classification": "7A", "weight_class": "150", "place": 2 }`
  This updates the existing 2026 row to place = 2. Then refresh the Blue members 2026 page.
- **Option B (Supabase SQL):**  
  `UPDATE wrestling_nchsaa_results SET place = 2 WHERE year = 2026 AND classification = '7A' AND weight_class = '150' AND wrestler_name ILIKE '%Ellison%Aaron%';`

---

## Counts (reference)

- **2026 men:** 360 placers (place 1–4) + 451 SQ (place 0) = **811** total (official NCHSAA numbers).
- Row counts by classification can be verified with `scripts/478-sq-2026-by-classification.sql`.

---

## More detail

- Full NCHSAA update process and upload UI: `docs/NCHSAA-DATA-UPDATE.md`.
