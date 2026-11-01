# 2026 Southeast Open presented by Resilite — source notes

Salem, Virginia · 1 November 2026 · a college open, entered by a handful of high schoolers.
Export: Trackwrestling bout CSV via Flo, 827 bouts, 359 entrants, 36 teams.

Imported as `southeast-open-2026` with `--require-team --no-placements`. No placements: a college
open's podium says nothing about a high school prospect, and none of ours reached one.

## One correction to the source

Holt Quincy's win over Campbell's Alex Allison is printed as `F` (fall) with the score `6-5 5:00`.
It was a medical forfeit — Matt was there. The row is stored as `M FOR`, which is the label this
same file uses for Jake Amiott's medical forfeit at 149, with the score left as the bracket had it.

The export is inconsistent about this on its own: it carries 7 `M FOR` and 8 `MFFL` rows, so the
`F` on this bout is a filing error rather than a judgement call. A fall also travels further than
it should — `lib/head-to-head.ts` and the significant-wins ladder leave forfeits out of "who is
better", and would have promoted this as a pinning win over a Division I opponent.

## North Carolina wrestlers in the field

Six, all current classes. Every one corroborated by weight: a high schooler enters an open within
a pound or two of his own class.

| Wrestler | Class | School | Entered as | HS weight | Wrestled | Record |
|---|---|---|---|---|---|---|
| Jake Amiott | 2028 | Topsail | NC United | 150 | 149 | 3-2 |
| Holt Quincy | 2027 | North East Carolina Prep | RAW | 126 | 133 | 1-2 |
| Paxton Kearns | 2028 | Trinity | NC United | 126 | 133 | 0-2 |
| Ben McCaleb | 2028 | Topsail | Unaffiliated HS | 190 | 184 | 0-2 |
| Marley Williams | 2028 | Mooresville | Unaffiliated HS | 175 | 174 | 0-2 |
| Wesley Sykes | 2029 | Union Pines | Unaffiliated Adult | 190 | 184 | 1-2 |

Five of the six are in `ENTRANT_LINKS` (lib/other-tournament-import.ts): their team cell is a club
or no team at all, so `--require-team` cannot corroborate them and a name-only link is not enough.
Only Holt Quincy's entry names his own club.

Wesley Sykes was filed in the adult division by the export. He wrestled 190 at the 2026 NCHSAA
state championships for Union Pines and 184 here; the weight and the school are his.

## No South Carolina wrestlers

Checked every entrant, not only the unattached ones. Of the 19 wrestlers on a non-college team
with no profile of ours, seven are placed out of state by our own bout data — Jack Cole (NJ),
Joaquin Duque (NJ), Matthew Dailey (PA), Sanchir Edington (PA), Tommy Wurster (OH), Zahid Shujaee
(MD), Branson Dodge (FL) — and the rest appear nowhere in it. None matches an NC or SC name.

## Out-of-state high schoolers with profiles here

Linked by their own state, not NC: Gary High (TN 2028, Cleveland). Brayden Owsley, Danny Gatto,
Ivan Fiel and Jacob Buffum (VA), Jasper Croom and Kyle Gallo (FL) have profiles but entered under
teams that cannot corroborate them, so they are unlinked — add them to `ENTRANT_LINKS` if those
states are worth filling in.

## Our alumni in the field

About twenty NC profiles from the classes of 2025 and 2026 wrestled here for their colleges — App
State, Campbell, Davidson, Gardner-Webb, Mount Olive, NC State, Noke RTC, VMI. They are left
unlinked on purpose: these are high school recruiting profiles, and putting college results on a
graduated wrestler's page is a product decision nobody has made. `--require-team` keeps them out.
