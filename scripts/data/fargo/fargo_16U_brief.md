# NC United — 16U Fargo Data Package (for Cursor)

This package contains NC's 16U (Cadet) Boys Freestyle results from the US Marine Corps National Championships ("Fargo"). Two data files accompany this brief:

- `fargo_16U_summary.csv` — one row per year (2023–2026), team-level stats.
- `fargo_16U_details.csv` — one row per wrestler (2025 & 2026), individual results.

Division label used throughout: **"16U Boys Freestyle"**. Event: **"US Marine Corps National Championships (Fargo)"**.

---

## Year-over-year summary (2023–2026)

| Year | Wrestlers | Record | Win % | Won ≥1 match | All-Americans |
|------|-----------|--------|-------|--------------|---------------|
| 2023 | 13 | 10-26 | 28% | 6/13 (46%) | 0 |
| 2024 | 18 | 29-36 | 45% | 10/18 (56%) | 0 |
| 2025 | 29 | 33-58 | 36% | 15/29 (52%) | 0 |
| 2026 | 15 | 35-31 | 53% | 11/15 (73%) | 3 |

**Headline:** 2026 is a breakout year. Smallest roster of the window (15), yet the best win rate (53% — first winning record), best depth (73% of wrestlers won at least one match), and the first 16U freestyle All-Americans of the four-year window — three of them.

**2025 context:** largest contingent (29) but a volume year — 36% win rate, zero freestyle AAs. (Note: Aaron Ellison earned a Greco-Roman AA in 2025; that is a different style and is NOT included in this freestyle dataset.)

**AA trend line: 0 → 0 → 0 → 3.**

## 2026 All-Americans

| Wrestler | Weight | Record | Place |
|----------|--------|--------|-------|
| Braylen Yates | 175 | 5-2 | 4th |
| Devin Hord | 120 | 6-2 | 5th |
| Jake Amiott | 144 | 6-3 | 8th |

Two more just missed the podium at 4-2 (bloodround): Mitchell Rowland (150) and Aaron Ruiz-Angel (215).

## Notable multi-year threads
- **Aaron Ruiz-Angel:** 3-2 (2025) → 4-2 (2026) at 215 — improving, still one win short both years.
- **Jake Amiott:** 2-2 (2025) → 6-3 / 8th AA (2026) at 138→144 — big jump.
- **Carson Raper:** 4-2 as a 16U (2025) → moved up to Juniors in 2026.

---

## Data caveats (for accuracy)
- Records for 2023 and 2024 are team-level only in this package (per-wrestler detail lives in the source sheets, not exported here). `fargo_16U_details.csv` covers **2025 and 2026 only**.
- 2025 & 2026 individual records are confirmed from official bout-by-bout results and roster placement data.
- `placement` is blank for DNP (did not place); `is_all_american` = true only for top-8 finishers.

## Column reference (`fargo_16U_details.csv`)
`first_name, last_name, event_name, event_year, division, weight, wins, losses, placement, is_all_american, notes`
- `weight`, `event_year`, `wins`, `losses` → integers
- `placement` → text ("4th") or empty
- `is_all_american` → boolean
