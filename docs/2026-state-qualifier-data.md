# 2026 State Qualifier Data — For RecruitNC

## Summary (for RecruitNC)

- **Where:** All 2026 NCHSAA state qualifiers (and placers) are stored in the **Supabase table `wrestling_nchsaa_results`** — same DB as LegacyNC. This is the single source for state/SQ on unified profiles.
- **How we store 2026 SQ:** One row per wrestler. For **state qualifiers who did not place**, we set **`place = 0`** (displayed as “SQ”). For **placers**, we set **`place = 1`** (1st) through **`place = 4`** (4th). 2026 has only 4 placers per weight; 2025 and earlier used 1–8.
- **Key columns:** `year` (2026), `classification` (e.g. `4A`, `6A`, `1A/2A`), `weight_class` (e.g. `106`), `place` (0 = SQ, 1–4 = placer), `wrestler_name`, `school`. Optional: `qualifying_tournament`, `qualifying_place` (regional info).
- **Men’s 2026 classifications:** `1A/2A`, `3A`, `4A`, `5A`, `6A`, `7A`, `8A`. Women’s (if loaded): `1-4A`.
- **To get 2026 state qualifiers only:** Query `wrestling_nchsaa_results` with `year = 2026` and `place = 0`, and for men filter `classification` to the seven men’s values above. Match to athletes by `wrestler_name` (LegacyNC normalizes “First Last” and “Last, First”).

---

## Where it’s stored

**Supabase table:** `wrestling_nchsaa_results`

Single source of truth for NCHSAA state results (placers and state qualifiers). LegacyNC and RecruitNC unified profiles use this table for state/SQ.

---

## Table schema (relevant columns)

| Column               | Type    | Description |
|----------------------|---------|-------------|
| `year`               | integer | e.g. 2026   |
| `classification`     | text    | Men: `1A/2A`, `3A`, `4A`, `5A`, `6A`, `7A`, `8A`. Women: `1-4A` |
| `weight_class`       | text    | e.g. `106`, `113`, `120`, … |
| `place`              | integer | **0 = State Qualifier (SQ)**. **2026+**: 1–4 = placers. **2025 and earlier**: 1–8 = placers. |
| `wrestler_name`      | text    | Full name (often "Last, First") |
| `school`             | text    | High school name |
| `qualifying_tournament` | text | Optional; regional identifier |
| `qualifying_place`   | integer | Optional; place at regional (1–4) |

---

## 2026 state qualifiers only (SQ)

**Men’s 2026 SQ** (place = 0):

```sql
SELECT year, classification, weight_class, place, wrestler_name, school,
       qualifying_tournament, qualifying_place
FROM wrestling_nchsaa_results
WHERE year = 2026
  AND place = 0
  AND classification IN ('1A/2A','3A','4A','5A','6A','7A','8A')
ORDER BY classification, weight_class, wrestler_name;
```

**Women’s 2026 SQ** (if loaded):

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

## Access from RecruitNC

- **API:** `GET /api/wrestling-achievements?name=<athlete name>` queries `wrestling_nchsaa_results` and returns all rows (including `place = 0`) in `achievements.all_results.nchsaa`.
- **Profiles:** View-profile and unified-profile call that API and pass `nchsaaResults` into `TournamentResultsDisplay`. The UI shows **place = 0** as **“SQ”** and 1–4 as Champion / 2nd–4th Place.

---

## Counts (reference)

- **2026 men:** 360 placers (place 1–4) + 451 SQ (place 0) = **811** total (official NCHSAA numbers).

---

## More detail

- NCHSAA update process / upload UI: `docs/NCHSAA-DATA-UPDATE.md` (if present).
