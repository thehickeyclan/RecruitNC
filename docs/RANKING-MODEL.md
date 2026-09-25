# The RecruitNC ranking model

What the ranking claims, what it deliberately ignores, and the rules it will not break.

This exists because the model previously lived only as comments spread across six files, and it
drifted from its own stated intent twice without anything noticing — a penalty documented as
"at most 30" was reaching 64, and a scoring rule fixed in one place stayed broken in two others.
A number you charge for has to be defensible to the family of the wrestler it ranks below, and
that means it has to be written down.

## What is ranked

**The top 30 of a graduation class, and nothing below it.** Positions 31+ on the admin board are
a shortlisting tool, not a ranking — thin evidence, never reviewed, and not published. A wrestler
outside the 30 is *unranked*, not rated low, and should never be described as "#84".

Rankings are per graduation year and per gender. Two numbers from different classes describe
different fields and are never compared.

## What it is trying to measure

Who a college coach should look at first, in this state, in this class. That is a question about
evidence, so the model prefers a measurement to an inference, and a recent one to an old one:

1. **A direct result.** Who beat whom settles an afternoon and needs no interpretation.
2. **A placement in a deep field.** Hard to get, hard to dispute.
3. **A record against known opposition.**
4. **A record against unknown opposition.**

Everything it scores is one of those four. Anything that is not — a form field, a free-text
achievement, a self-reported honour — is scored at zero, because eighteen points of a teenager's
public ranking should not turn on how much of a profile they filled in.

## The rules it will not break

These are enforced by `ranking-policy.test.ts`. Each was broken in production first.

- **Nobody is charged for something they could not choose.** An event with a fixed roster — any
  duals meet — gives credit and never takes it. A wrestler cannot enter one alone.
- **An absence is weaker evidence than a performance.** The total missed-event penalty is capped
  below the value of winning the state's deepest field, and is charged once however many events
  a quiet season spans.
- **The same quiet season costs the same in every class.** Penalty size cannot depend on how many
  events happened to clear the participation floor in one year group.
- **Who you beat decides what a win is worth.** The same opponent is valued identically in any
  bracket they appear in; the event's name never overrides their ranking.
- **A result has to have been wrestled.** Forfeits, injury defaults and unwrestled weights score
  nothing, and one bout never outscores a full week of them.
- **A losing result is never hidden.** A loss to somebody ranked below is surfaced wherever it
  happened, including at the Tournament of Champions.
- **The board is for high school recruiting.** Elementary and middle school results never enter it.

## What it scores

Component weights live in `RANKING_COMPONENT_WEIGHTS` (`recruitnc-ranking-engine.ts`). In order of
influence:

| Component | What it reads | Why it is weighted as it is |
|---|---|---|
| `national` | NHSCA, Super 32, Fargo, TOC placements and records | The hardest thing on any résumé and the least ambiguous |
| `matchResume` | Season record and quality wins | Who they actually wrestled |
| `duals` | NHSCA and club duals records, plus the team's finish | Real competition, but roster-limited — credit only |
| `allAmerican` | National podium finishes | A credential that travels |
| `rankedWins` | Wins over ranked or nationally ranked opponents, graded by the opponent | A direct measurement rather than an inference |
| `state` | NCHSAA placements | Real, and smallest: eight classifications means eight champions per weight |
| `rankWrestler` | An outside service's number | A cross-check, not an input to trust |
| `collegeOpen`, `profile` | — | Zero. Both scored free text |

Two adjustments run after scoring: a **head-to-head reorder**, which keeps a direct winner above
the wrestler they beat when the résumés are within reach, and the **missed-window penalty**, which
charges a wrestler for rooms their class turned out for and they skipped.

## What it cannot see

State these before defending a number.

- **Wins are only as good as our opponent data.** Duals matches store initials, so a duals win can
  never credit a named ranked opponent.
- **`athletes.prospect_ranking` is the ranked-win index**, and it holds only the last *published*
  order — 30 of 106 in the Class of 2027. Wins over unranked classmates score as unranked.
- **A missing import looks exactly like a weak wrestler.** An athlete with no match history scores
  zero on the largest component. Check the data gaps before believing a low placement.
- **An athlete with no `gender` is invisible to every board**, silently, because the query filters
  on it.

## How a ranking gets published

1. **Work the order** on `/admin/rankings/board`. The formula's view is advisory and is never
   applied on its own.
2. **Save.** Writes `ranking_drafts`. Nothing is public. The board reloads from this draft.
3. **Review.** `ranking-review.ts` reports what contradicts the order — wrestlers ranked above
   somebody who beat them, ratings that disagree, static résumés, missing data. It never proposes
   a rank.
4. **Publish top 30.** Copies the saved draft to `athletes.prospect_ranking` (the web) and
   `public_rankings` (the iPhone app) in one press. Only what was saved is published, so an order
   nobody reviewed cannot ship.

## When the model is wrong

It will be. The useful question is which kind of wrong:

- **The formula disagrees with a reviewer** — normal, and the reviewer wins. Record the override.
- **The formula disagrees with itself** — a rule contradicting this document. Fix the code and add
  a policy test.
- **The formula is reading the wrong thing** — usually a data gap wearing the costume of a
  judgement. Check `match_count`, the canonical state rows, and the opponent index first.
