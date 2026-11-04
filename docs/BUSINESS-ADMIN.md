# The Business admin

Where the RecruitWrestlers business is run: `/admin/business`. Built 4 November 2026 so Matt and
Rhett can see the numbers and present the family deck without Rhett holding admin.

## Who can open it

Rhett is sales and social. He is **never** `is_admin` — that flag opens all ~250 admin pages,
contacts, Blue, fundraising, orders and the athlete editors among them. He holds a grant in
Supabase Auth `app_metadata`, which only the service role can write:

```
app_metadata.business_access = true
```

```bash
npx tsx scripts/grant-business-access.ts --email rhett@example.com
npx tsx scripts/grant-business-access.ts --email rhett@example.com --revoke
npx tsx scripts/grant-business-access.ts --list
```

They must sign out and back in for it to take effect.

The grant opens the named list in `lib/business/access.ts` and nothing else. **Closed unless
listed** is the direction that stays safe: an admin page added next month is shut to a business
account until somebody puts it on the list on purpose.

Three layers, none of them alone:

1. `app/admin/layout.tsx` stops demanding admin for those paths, so the page renders.
2. Each page calls `requireBusinessViewer(path)`, which is the real gate.
3. The API routes behind the two client pages check the grant themselves.

## No family details, ever

Matt, 4 November 2026: Rhett sees no PII about kids or parents. Counts, charts and trends only.

`college_coach_stars` is the trap. It carries the coach's own CRM notes on the same row as the
star: `parent_name`, `parent_phone`, `parent_email`, `athlete_cell`, `financial_efc`,
`ability_to_pay`, `financial_notes`. `lib/business/load.ts` selects three columns from it —
`coach_user_id, athlete_id, starred_at` — and `StarRow` is the type that keeps it that way. A
`select("*")` there would hand all of it to an account that must never see it.

`/admin/command-center-activation` was on the list until somebody read what it renders: one row
per family headed by `full_name || email`. It came off and stays admin-only.

Wrestlers' names do appear, on the rankings board and on college interest, both of which Matt
named. A wrestler's name and results are the product. A parent's details are not.

**Before adding a page to `BUSINESS_PAGES`, open it and look at what it renders.**

## The six metrics

`lib/business/metrics.ts` is pure and tested; `lib/business/load.ts` reads; `lib/business/cache.ts`
holds one read for five minutes, because the load is ~13,000 events over 8,600 wrestlers and takes
about seven seconds.

| Metric | Source | First row |
|---|---|---|
| Profiles created | `athletes.created_at` | 30 Apr 2025 |
| Profiles claimed | `athletes.claimed_at` | 29 Jul 2025 |
| Profile edits | `athlete_audit_log`, `change_type = athlete_edit` | 12 Jan 2026 |
| College views | `user_analytics` `profile_view`, college coaches only | 3 Feb 2026 |
| College stars | `college_coach_stars.starred_at` | 4 Nov 2025 |
| Logins | `user_analytics` `signin_completed` | 19 Jul 2026 |

Those dates are when each source began recording, not when the thing began happening. Wrestlers
were signing in long before July 2026; the event that counts a sign-in is what is young.
`METRIC_STARTS` hard-codes them, and `npx tsx scripts/business-metrics.ts --starts` re-measures
against the data and says if one has moved.

Two limits are built in rather than papered over:

- **Three sources carry no site stamp.** `event_data.site` has only been on events since
  1 November 2026, and profiles, edits and stars are not events at all. Filtering by brand hides
  those series and says why, instead of guessing.
- **A sign-in belongs to an account, not a wrestler.** Its state and gender are the claimed
  wrestler's. An account that has claimed nobody has neither: 686 of 885 sign-ins on 4 November
  2026. Those are counted as unassigned and reported on the chart, never dropped into a state.

Check any of it from the command line, without a browser or a sign-in:

```bash
npx tsx scripts/business-metrics.ts --state NC --gender Female
```

## The family deck

`/admin/business/deck`. The twelve approved slides live in `lib/business/deck/slides.ts`, ported
from the Claude artifact Matt reviewed word by word, with their images in `public/deck`. Arrow
keys and clicks move, `F` is full screen, `N` shows the speaker notes. The page gets the bare
frame from `components/app-chrome.tsx` — no menu, no footer, no assistant launcher over a slide
in front of a room.

**The per-state slide is live and never in the PDF.** Two reasons, both of which bite: a
downloaded PDF outlives the numbers on it, and a thin state argues against the person presenting
it. `stateSlideReady` refuses to build the slide for a state with no claims and no coach views —
South Carolina, Virginia and Pennsylvania were all in that position on 4 November 2026.

The rule is enforced by construction, not by care: the PDF at
`public/deck/RecruitWrestlers-for-Families.pdf` is a file holding the twelve and nothing else.
There is no code path from the deck page into it. Rebuild it with
`node scripts/build-deck-pdf.cjs` when a slide changes, and update `DECK_AS_OF` and the dates
written on the slides in the same pass.
