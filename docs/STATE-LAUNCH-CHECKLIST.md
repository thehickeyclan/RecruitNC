# State launch: go / no-go

Opening a state to college coaches is one line, `live: true` for the state in `lib/recruiting/brand.ts`. This checklist is what has to be true first. North Carolina is the standard: every number is reported beside NC's, and nothing here is asked of a new state that NC does not meet.

Written 17 October 2026, before South Carolina, after a hand check found a state champion with no state and a namesake's result on his profile.

## 1. Data (the script)

```bash
npx tsx scripts/state-readiness.ts --state SC
```

Read-only. Exits 0 when every gate passes, 2 when one fails, and lists the wrestlers behind each failure. Add `--all` to also list the review rows.

| Gate | Pass when | Why |
|---|---|---|
| Official placers accounted for | **100%** of the latest championship's placers, to each association's official placing depth: a profile, or a named reason (graduated, duplicate, namesake, source conflict, Matt-approved exception) | The launch line is "every state placer has a profile"; a 90% gate let SC's SCISA placers go unprofiled |
| Class years accounted for | 100% accounted; at most 5% unresolved, **each named** | No class year = absent from every class list and board |
| State stamp | 0 championship-linked profiles with no state (a recorded move to another state is allowed) | The Alex Johnson / Logan Hinton fault: a champion invisible in his own state |
| Unexplained pre-freshman results | 0 unexplained. A verified 7th or 8th grade varsity result, where the association allows it, stays and is named | A namesake's result, or a wrong class year |
| NC results on the state's profiles | 0, or each one reviewed | A move is possible; it is never assumed |
| Duplicates | 0 same name + class | Two profiles split views, messages and claims |
| School | ≥ 98% | Search and the profile card need it |
| Gender | 100% | Men's and women's boards are separate |

**Accounting file** (Muse's review, 20 Oct 2026): `docs/state-launch/<STATE>-accounted.json` names every exception the gates accept, each with a reason:

```json
{
  "placers": [{ "name": "…", "school": "…", "season": 2026, "reason": "graduated | duplicate | namesake | source-conflict | approved", "note": "…" }],
  "classYearUnresolved": [{ "athleteId": "…", "note": "what was searched" }],
  "preFreshmanVerified": [{ "athleteId": "…", "note": "the bracket that shows the grade" }]
}
```

Graduates are found without the file where we can: a class year in the identity registry before this year's seniors, or a profile exported by `scripts/prune-graduated-profiles.ts` (name and school must agree). Placing depth per association is `PLACING_DEPTH` in the script (NCHSAA 4, NCISA 6, others 6 until the source manifest says otherwise).

Reported, not blocking: profiles per class, girls, claimed (coaches can only message a claimed profile), photos, and independent-school results from 7th/8th grade (NCISA and SCISA allow middle schoolers on varsity: check the class year, don't unlink).

## 2. Product (by hand, as a coach)

Sign in as the test coach (testcoach.thehickeyclan@gmail.com) on app.ncwrestlingunited.com **and** on recruit.wrestlingguild.com, with the state still `live: false` and then after the switch on a preview build.

- [ ] Athletes: the state appears in the picker; class and weight filters work; weight shown is **last competed**
- [ ] Three profiles (a champion, a mid-placer, a girl): association named correctly (e.g. SCHSL / SCISA), state section and credential cards right, no other state's results
- [ ] Scouting report on the same three: read it in full; every absence stated, nothing invented, he/she from gender
- [ ] Coach Home, Perfect Recruit: counts include the state; coverage wording reads right
- [ ] Compare: still limited to `COMPARE_STATES` (lib/recruiting/states.ts), and its wording names only those states, not the full live list (today it reads `recruitingCoverage()`, which would wrongly include the new state)
- [ ] Rankings: say plainly whether the state has a board yet; never show an empty one
- [ ] Logos and school names on the state's profiles render
- [ ] Nothing new on NC United's front end beyond the coach-facing coverage line

## 2b. Real users (before public launch)

Internal checks are not enough (South Carolina's lesson): one **real in-state college coach session** and one **real family claim session**, with every surprise logged and fixed before the public launch. South Carolina is grandfathered; Virginia and every state after it are not.

## 3. Decision

- [ ] Script exits 0 (or each failing row has a written reason Matt accepts)
- [ ] Section 2 done, with screenshots
- [ ] Section 2b done: one real coach and one real family, surprises fixed
- [ ] Matt says go. Then flip `live: true`, ship, re-run the script and repeat section 2 on production.

After launch, not before: the family claim campaign for the state, the state page on wrestlingguild.com (`/recruit/<state>` from "coming soon" to live), and a coach announcement.
