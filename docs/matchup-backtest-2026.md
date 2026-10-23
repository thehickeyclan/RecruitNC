# Matchup Intelligence: rating model backtest (Oct 2026)

Private research. Nothing here is published, read by a page, or exposed by an API. The Compare
tool is untouched. Code: `lib/matchup/` (tested: `lib/matchup/matchup.test.ts`). Runner:
`scripts/matchup/backtest-2026.ts` (read-only). Every table it prints:
[matchup-backtest-2026-tables.md](matchup-backtest-2026-tables.md).

## Recommendation: no-go for coaches. A gated internal pilot is a go.

**The predictions are not good enough to show coaches as a general "win probability".** Across
every bout from 1 Oct 2025 on, the model picks the winner 61% of the time (coin flip: 50%).
That average hides two very different groups:

| Matchup | Share of bouts | Accuracy | Stated vs actual |
|---|---|---|---|
| Both wrestlers well rated (RD < 250) | 42% | **69.3%** | within 1 point (calibration error 0.9%) |
| At least one wrestler barely known | 58% | ~55% | close to a coin flip |

When the model knows both wrestlers, its numbers are honest: when it says 75%, the favourite wins
about 76% of the time. The RD (rating deviation) tells us which bouts fall in that group before
they are wrestled. That is the useful result.

It is still a no-go for coaches, because:

1. **Most matchups a coach would ask about are in the barely-known group.** NCHSAA States 2026:
   57% accuracy when rated on data before 1 Oct 2025. Same-state bouts: 58%. Journeymen and the
   duals: 50-56%. Girls: 58%. Only 33% of bouts with an NC wrestler pass the RD gate.
2. **Glicko-2 does not beat plain Elo.** Overall Elo is slightly better (log loss 0.633 against
   0.641). On gated bouts they are level. The only thing Glicko-2 adds is the RD gate, and
   "both wrestlers have 5+ bouts on file" works about as well with Elo (69.5%, calibration error
   0.4%).
3. **On rematches it loses to the Compare tool's rule.** There were 462 test bouts that rematched
   a meeting from the previous 12 months. The previous winner won again 74.7% of the time; the
   model was right 72.9%. A number shown beside Compare would sometimes contradict the
   head-to-head and be wrong more often than the head-to-head. Compare must keep deciding.
4. **There is no fair rank baseline yet.** National rankings exist only from Sept 2026, so
   "higher rank wins" cannot be tested on 2025-26 without hindsight. The one leak-free check
   (Journeymen 2026) has 40 bouts: rank 82.5%, model 70%. With hindsight, on the test events,
   rank and model tie at about 73.5% on the 1,136 bouts with a top-30 wrestler. The model does
   not yet beat what a coach already sees.

**What would change it to a go:**

- **Live test at Super 32 2026.** Freeze ratings before the event, score it afterwards, publish
  nothing. Pass if gated accuracy is 68% or better and calibration error is under 3%.
- **Show a number only when both RDs are under 250.** Otherwise show "not enough data". Never
  show 50% as though it were a prediction.
- **Never show a probability that contradicts a head-to-head within 12 months.** Show the
  head-to-head instead.
- **Close the NC gap first.** See "Where it is unreliable".

## 1. Bout data audit

**Volume.** `other_tournament_bouts` holds 242,359 rows, and national brackets store every bout
twice (once from each side). After collapsing those mirrors (113,847 duplicates removed) and
dropping forfeits, byes, injury/medical defaults, DQs and no-contests (6,536 rows), 121,976
contested bouts remain. `state_tournament_bouts` adds 10,706 placement bouts (49 states, 2025 and
2026). We skipped 866 rows for VA/SC/MD seasons whose full brackets are already in the bout
store. **Total: 132,682 contested bouts, Mar 2023 to Oct 2026.** Nothing contradicted itself:
every mirrored pair agreed on the winner. NCHSAA 2026 finals winners match the
`wrestling_nchsaa_results` champions in all 203 finals where the champion could be matched by name (2 of 205 could not).

**Linking a bout to a person.** National rows go through `identity_aliases`, using linked
aliases only; review aliases are never treated as a person. State placement bouts go through
(name, state, gender) on `athlete_identities`, and only where exactly one person matches. That
registry was built from those same placers. State-championship brackets (NCHSAA, VHSL, VISAA,
SCHSL, SCISA, MD) name a school on every row, so they are resolved on (name, the association's
state, gender) in the same way. Open club events (Journeymen, TOC, duals) are never given a
state. A wrestler the registry does not hold is rated under a temporary (name, state) key, or
(name, club) where no state is known. That key exists only inside one run and is never stored
(see the identity-registry-scope decision).

**Share of bouts with both wrestlers identified in the registry:**

| Event | Bouts | Both | One | Neither |
|---|---|---|---|---|
| Super 32 2024 / 2025 | 3,006 / 3,178 | 78.0% / 79.0% | 21% / 20% | 1% / 1% |
| Super 32 2023 | 3,032 | 59.5% | 35.0% | 5.5% |
| Fargo 2023-2026 | 55,675 | 50-70% | 27-36% | 3-14% |
| NHSCA Nationals 2023-2026 | 38,712 | 36-56% | 35-38% | 9-28% |
| State placement bouts (49 states) 2025-26 | 10,706 | 99.9% | 0.1% | 0% |
| VA/SC/MD state brackets 2024-26 | 5,835 | 80-98% | 2-15% | 0-5% |
| NCHSAA States 2026 | 1,283 | 39.0% | 60.1% | 0.9% |
| Journeymen Fall Classic 2024-26 | 4,340 | 0-2% | 9-23% | 75-91% |
| Journeymen Women's, USAW Women's 2026, Early Entry, duals, TOC | ~6,900 | 0-11% | 5-17% | 72-95% |

Journeymen, duals and TOC rows carry a club name, not a state. The registry only links those
when the club is the wrestler's school, so the people there are mostly unconnected to the
national graph.

**How states connect.** The only bridge between states is a national event. Every state has
thousands of cross-state national bouts (PA 15,073, NC 7,575, MS 308), so all 50 states sit in
one connected pool. What varies is how much of each state's field reaches it. In the median
state, 32% of state-tournament wrestlers also have a national bout. That figure is from placers
only, which flatters it. In the full-bracket states it is lower: NC 34%, VA 27%, SC 26%, MD 19%.
The other two-thirds are rated only against their own state, and their ratings say nothing
reliable about a wrestler from elsewhere.

## 2. The model

- **Glicko-2** (Glickman 2013; `lib/matchup/glicko2.ts`). It keeps a rating, an RD and a
  volatility for each person. The test reproduces Glickman's published worked example
  (1464.06 / 151.52 / 0.05999).
- **One event is one rating period.** Every bout at an event is predicted from the ratings as
  they stood the morning it began. Only then is the event rated, so a semifinal is never
  predicted from that day's quarterfinal.
- **RD grows with time away:** RD² rises by c² for each day without a bout. An extra boost every
  1 June (the grade change) was tested; the validation season preferred none, because the
  per-day growth already covers it. The tuned c is 3, about +57 RD over a year.
- **First appearances depend on where the wrestler shows up.** This was the most important fix.
  At first, every newcomer started at 1500, level with an average national entrant. At NCHSAA
  2026 that made a never-travelled kid the favourite over an NC kid who had gone 0-2 at NHSCA.
  The favourite then lost: the model scored 46%, worse than a coin flip. Just entering a national
  event is evidence of quality. A first appearance at a state tournament now starts 100 lower.
  That value was tuned on validation only, and it raised NCHSAA 2026 to 57%.
- **Tuning.** Every setting was chosen on the 2024-10-01 to 2025-09-30 season; the test events
  were never used. The choices: τ 0.3, initial RD 275, debut offsets state -100 / open 0, and a
  recalibration exponent of 1.15 for Glicko-2 (raw Glicko-2 is slightly underconfident on
  well-known wrestlers). Plain Elo got the same debut offsets, K tuned to 96, and needed no
  recalibration. The τ setting made no measurable difference.

## 3. Backtest results

**Static test.** Rated on everything before 2025-10-01, then predicting the two named events
with ratings frozen:

| Event | Bouts | Glicko-2 acc | Log loss | Brier | Cal. error | Elo acc | Elo log loss |
|---|---|---|---|---|---|---|---|
| Super 32 2025 | 3,178 | **70.6%** | 0.565 | 0.192 | 2.8% | 69.9% | 0.571 |
| NCHSAA States 2026 | 1,283 | 57.3% | 0.673 | 0.240 | 2.5% | 60.6% | 0.642 |
| Both | 4,461 | 66.8% | 0.596 | 0.206 | 2.4% | 67.2% | 0.592 |
| Coin flip | | 50% | 0.693 | 0.250 | | | |

**Super 32 2025 calibration (Glicko-2):**

| Model said | Bouts | Favourite won |
|---|---|---|
| 50-60% | 1,005 | 54.6% |
| 60-70% | 871 | 68.9% |
| 70-80% | 733 | 79.5% |
| 80-90% | 431 | 88.2% |
| 90-100% | 138 | 94.9% |

**Roll-forward.** Every event from 1 Oct 2025 to Journeymen Oct 2026 (49,076 bouts), each
predicted from everything before it:

| Group | Bouts | Glicko-2 acc | Log loss | Cal. error | Elo acc | Elo log loss |
|---|---|---|---|---|---|---|
| All | 49,076 | 60.9% | 0.641 | 1.2% | 61.1% | 0.633 |
| Both RD < 250 | 20,646 (42%) | 69.3% | 0.578 | 0.9% | 69.0% | 0.579 |
| Both RD < 150 | 7,462 (15%) | 70.7% | 0.567 | 3.1% | 69.8% | 0.570 |
| Both 5+ prior bouts | 11,560 (24%) | 69.9% | 0.571 | 1.8% | 69.5% | 0.575 |
| NC wrestler, both RD < 250 | 1,687 of 5,182 | 69.0% | 0.582 | 1.4% | 69.9% | 0.577 |

**Calibration, both RD < 250:**

| Model said | Bouts | Favourite won |
|---|---|---|
| 50-60% | 6,256 | 55.2% |
| 60-70% | 5,486 | 66.3% |
| 70-80% | 4,838 | 75.9% |
| 80-90% | 3,138 | 85.4% |
| 90-100% | 928 | 94.3% |

**Roll-forward by group (Glicko-2 accuracy / log loss).** Full tables are in the appendix.

- **Prior bouts (fewer of the two):** 0 = 54.7% / 0.687 (58% of all bouts); 1-4 = 68.6%;
  5-9 = 69.3%; 10-19 = 70.3%; 20+ = 70.6%.
- **Event:** Super 32 70.6%, Fargo Junior 68-70%, Fargo 16U 59-67%, NHSCA 2026 60.0%,
  49-state placement bouts 56.8%, NCHSAA 2026 54.4% (Elo 59.9%), VHSL 58.8%, Journeymen 52-56%,
  duals 50-51%, USAW Women's 50-53%.
- **Style:** Greco-Roman 68.2%, freestyle 61.8%, folkstyle 59.0%. One rating is shared across
  styles.
- **Weight:** flat at 58-62%. The lightest (≤113) and heaviest (216+) are the weakest, which
  fits growth and weight-class moves.
- **Gender:** boys 61.4%, girls 58.2%.
- **State:** PA 66%, IA 66%, MD 66%, CA 65%, most others 61-64%, NC 58.7% (Elo 60.9%). Bouts
  where the state is unknown (club events) score 52.8%.
- **In-state 58.0%, cross-state 64.0%.** National events are where the model has history on
  both wrestlers.

## Where the model is unreliable

1. **First-time and barely-seen wrestlers** (RD 250+, 58% of bouts): about 55%. The model says
   so itself by keeping those bouts near 50%. Show "not enough data", not a number.
2. **Inside NC (and within any one state).** Two-thirds of NC state-tournament wrestlers have no
   national bout, and we hold no NCHSAA bouts before 2026. Their ratings rest on one tournament.
   Importing earlier NCHSAA brackets is the single biggest lever for NC.
3. **Club-singlet events** (Journeymen, duals, TOC, I-64): the rows carry no state, and almost
   none of those wrestlers are linked to a person.
4. **Girls and women's events:** linkage is low, the fields are thinner, and gender is unstated on
   most NHSCA/Super 32 rows.
5. **Wrestlers with very long histories** (20+ bouts): accurate, but calibration drifts (4.7%).
   The model is less sure of them than it should be.
6. **Rematches:** defer to the head-to-head (see the recommendation).

## Next steps (none started)

- **Pre-register the Super 32 2026 live test:** freeze ratings before the event, score it after.
- **Import NCHSAA brackets for 2024 and 2025,** if they can be sourced. That fixes the NC gap
  more than any model change.
- **Try a grade/age term.** Older wrestlers beat younger ones, and the model cannot see that.
  Only 4,201 identities have a class year, so this waits on grade coverage.
- **Revisit gradient-boosted models only after the above,** using these ratings and RDs as inputs.
