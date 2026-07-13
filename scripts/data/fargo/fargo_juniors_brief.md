# NC United — Junior Fargo Data Package (for Cursor)

NC's Junior Boys Freestyle results from the US Marine Corps National Championships ("Fargo"). Two data files accompany this brief:

- `fargo_juniors_summary.csv` — one row per year (2023–2026), team-level stats.
- `fargo_juniors_details.csv` — one row per wrestler (2025 & 2026), individual results.

Division label: **"Junior Boys Freestyle"**. Event: **"US Marine Corps National Championships (Fargo)"**.

---

## Year-over-year summary (2023–2026)

| Year | Wrestlers | Record | Win % | Won ≥1 match | All-Americans |
|------|-----------|--------|-------|--------------|---------------|
| 2023 | 23 | 38-47 | 45% | 17/23 (74%) | 0 |
| 2024 | 24 | 31-48 | 39% | 20/24 (83%) | 0 |
| 2025 | 30 | 33-60 | 35% | 19/30 (63%) | 0 |
| 2026 | 20 | 24-40 | 38% | 12/20 (60%) | 0 |

**Read:** The Junior side has not produced an All-American in the four-year window. Roster size peaked in 2025 (30) and dropped to its lowest in 2026 (20). Win % has hovered in the high-30s/mid-40s. Depth (share of wrestlers winning ≥1 match) has trended down from a 2024 high of 83% to ~60% in 2025–2026 — i.e. more two-and-outs relative to earlier years.

**Top individual runs:**
- **2026:** Bentley Sly (157) 6-2 — reached the consolation bloodround, one win short of AA (deepest Junior run of the window). Carson Raper (113) 5-2.
- **2025:** Gabe Rogers (126) 3-2, Troy Shannon (157) 3-2, Jackson Rowling (150) 3-2.

**Multi-year thread — Bentley Sly:** 4-2 at 150 (2025) → 6-2 at 157 (2026). Climbing toward the podium; the clearest Junior development story.

---

## Data caveats (for accuracy)
- `fargo_juniors_details.csv` covers **2025 and 2026 only**. 2023 & 2024 are team-level only in this package.
- 2026 records are confirmed from bout-by-bout results and roster placements.
- Some 2025 individual records were confirmed manually against official results; treat as accurate but source-of-truth is USA Bracketing if a discrepancy arises.
- `placement` is blank for all Juniors (no AAs in 2025/2026); `is_all_american` = false throughout.

## Column reference (`fargo_juniors_details.csv`)
`first_name, last_name, event_name, event_year, division, weight, wins, losses, placement, is_all_american, notes`
- `weight, event_year, wins, losses` → integers
- `placement` → text or empty
- `is_all_american` → boolean

---

## Combined program note (Juniors + 16U)
For a full program view, pair this with the 16U package. The contrast is the story:
the **16U side is the engine** (win % 28→45→36→53, and 0→0→0→**3** AAs in 2026),
while the **Junior side is flatter** (no AAs, shrinking roster). NC's momentum is
strongest in the younger age group — the pipeline is rising.
