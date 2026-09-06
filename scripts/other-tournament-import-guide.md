# Other Tournaments (Super 32 Early Entry / qualifiers) — Import Guide

## Super 32 Early Entry is NOT Super 32

They are two different tournaments. Early Entry (the "Super 32 Qualifier") is a separate
event whose **top 4 at each weight earn a chance to enter Super 32 when registration opens**.

- Early Entry / qualifier results → `other_tournament_results` + `other_tournament_bouts`,
  shown in the profile's **Other Tournaments** section (above Super 32).
- Super 32 itself → `super32_results`, unchanged.

Never merge one into the other. A kid who went 5-0 at Early Entry did not go 5-0 at Super 32.

## Tables

| Table | One row per | Powers |
|---|---|---|
| `other_tournament_results` | athlete per event | placement, record, qualifier flag, profile section, rankings, TOC seeding |
| `other_tournament_bouts` | **athlete per bout** (so each bout is stored twice, once per side) | strength of wins, direct wins / head-to-head |

Schema lives in `scripts/create-other-tournament-tables.sql`. RLS matches `fargo_results`:
public read, writes via the service role only.

### high_school is resolved, never copied

The source `Winning Team` / `Losing Team` column is a mix of clubs and high schools, and the
`City` column is a city. Both go in `club` (source spelling, for reference). `high_school` is
only ever set from the matched `athletes` row. Same rule as the Super 32 import guide — writing
a city or club into `high_school` breaks athlete and high-school search.

## Importing a new leg (GA, VA, ...)

The source is a Trackwrestling bout export: one row per bout, cells wrapped as `="value"`,
columns `Date, Weight, Round, Winning Wrestler, Winning Team, Result, Win Type, Losing
Wrestler, Losing Team, City, State, Event`.

1. Drop the CSV in `scripts/data/`.
2. Dry run first and read the match report:

```bash
npx tsx scripts/import-other-tournament-csv.ts \
  --file scripts/data/ga-super32-early-entry-2026.csv \
  --event-key super32-early-entry-ga-2026 \
  --event-name "GA Super 32 Early Entry" \
  --short-name "Super 32 Early Entry" \
  --event-state GA --event-date 2026-09-05 --year 2026 --gender M \
  --dry-run
```

3. Check the `✓` lines. Every one writes results onto that profile — a wrong match puts
   another kid's record on someone's page. Anything listed as `?` (ambiguous) is imported
   unlinked on purpose; link those by hand if you can identify them.
4. Re-run without `--dry-run`.

Re-running replaces every row for that `event_key`, so a corrected CSV can simply be
re-imported. Use a distinct `event_key` per state and year.

## Legs imported so far (2026)

| Event key | Entrants | Linked to profiles |
|---|---|---|
| `super32-early-entry-nc-2026` | 377 | 46 |
| `super32-early-entry-ga-2026` | 483 | 7 |
| `super32-early-entry-va-2026` | 693 | 5 |

## Each leg prints its bracket differently

The NC leg says `Finals` / `Quarter-Finals` / `Consi of 16 #1`. The VA leg says
`1st Place Match` / `Quarterfinal` / `Cons. Round 3`. Placement detection keys off the
**canonical** round (`canonicalRound` in `lib/other-tournament-import.ts`), never a literal
string — checking for `"Finals"` alone would silently give the VA leg zero placements.

`other_tournament_bouts.round` stores the canonical name so a profile reads consistently
across legs; `source_round` keeps the label the bracket printed.

**When adding a new leg, check the round labels first** and add any new vocabulary to
`ROUND_ALIASES`:

```bash
cut -d, -f3 scripts/data/<file>.csv | sort | uniq -c | sort -rn
```

## Two brackets can share one weight label

The VA leg ran separate youth and high-school brackets both labelled 106, 113, 120 and 132 —
two champions per label, and no division column to tell them apart. Brackets are separated by
who actually wrestled whom: within a weight, everyone reachable through a chain of bouts is
one bracket. That is what `entrants` ("field of N") counts, so nobody is shown in a 58-man
field that was really two brackets of 50 and 8.

Round-robin pool brackets have no placement match, so those entrants get a record and no
placement. That is correct, not a gap.

## How athletes are matched

`lib/other-tournament-import.ts`, unit-tested in `lib/other-tournament-import.test.ts`.

Matching is deliberately strict — **exact first + last name, or a known nickname**
(Christopher→Chris, Jake→Jacob). Suffixes (Jr, III) are stripped.

**Matching on a shared last name plus a first initial is not allowed.** It was tried and
produced wrong people: "Catoe Byrd" → "Connor Byrd", "Blake Smith" → "Brayden Smith",
"Justin Campos" → "Jacob Campos". Those are different kids.

When more than one profile shares a name, in order: the one whose school/club matches the
source team; the filled-in one over an empty duplicate stub; the most complete row when the
candidates are plainly the same person duplicated. Genuinely different people are reported
ambiguous and left unlinked rather than guessed.

Most entrants will not match, and that is expected — these events draw heavily from out of
state. Unlinked rows stay in the table as the event record; they just do not appear on a
profile.

## Club corrections

Bracket operators mistype club names, and the team is not cosmetic: it is half the key that
separates two wrestlers with the same name, and it is used to pick between same-named
profiles. Fixes go in `CLUB_CORRECTIONS` (`lib/other-tournament-import.ts`), applied to the
raw rows before anything keys off the team, so re-importing the export keeps them. Never
hand-edit the database or the source CSV.

Scope a correction to one athlete unless the whole team label is confirmed wrong. The VA
bracket listed Gavin Hickey as "Roanoke Area Wrestling" when he wrestles for Raleigh Area
Wrestling — but the three other wrestlers under that label (Christopher Verner, Maximus
Milette, Brady Booth) are genuinely Roanoke, so the correction names Gavin only.

## What the data feeds

- **Profile → Other Tournaments** (above Super 32): placement, record, field size, the
  Super 32 qualifier badge, and strength of wins.
- **Strength of wins**: every win annotated with who the opponent was. A win is called out
  when the opponent placed at the event, qualified for Super 32, is a publicly ranked
  RecruitNC wrestler, or is in the TOC field. Ranked only counts inside the published cap
  (`lib/public-rankings-cap.ts`) so a profile never cites a rank nobody can look up.
- **Last competed weight** (profile header): qualifiers carry the highest priority within a
  year, since they run early season and are usually the most recent thing wrestled.
- **Rankings** (`lib/rankings/recruitnc-ranking-engine.ts`): counts toward the national
  résumé at `QUALIFIER_WEIGHT` (0.6) — real out-of-state fields, but not the deeper
  brackets of Super 32 / NHSCA / Fargo themselves.
- **TOC seeding** (`lib/toc/ai-seeding.ts`): same 0.6 weight, plus a reason line naming the
  qualifier finish.
- **Direct wins / head-to-head**: `summarizeDirectResults` aggregates bouts where both
  wrestlers have profiles.
