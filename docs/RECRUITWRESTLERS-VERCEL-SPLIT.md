# Moving recruitwrestlers.com to its own Vercel project

Plan agreed with Matt, 22 October 2026. Same code, same GitHub repo, same Supabase database; two
Vercel projects. NC United's project (`v0-new-college-commits`) is unchanged. Do it **before
launch**: today only staff use recruitwrestlers.com, so the switch touches nobody.

## Why

- **Analytics per site.** Today one Vercel Web Analytics dashboard mixes both addresses.
- **Ownership.** The new project lives in a Guild Ventures Vercel team. The database move to Guild
  Ventures can follow separately.
- **Separate settings and logs** per business.

Nothing changes for accounts: one database, so one login works on both sites.

## What stays exactly the same

- **The code and the brand logic.** The middleware decides by address (`stagedBrandForHost`), so
  either project serves either brand correctly.
- **Pages that belong to NC United.** Asked for on recruitwrestlers.com, they still forward to
  app.ncwrestlingunited.com.
- **Stripe.** NC United's webhook points at app.ncwrestlingunited.com and stays with the old project.
  Guild Ventures' webhook points at www.recruitwrestlers.com and follows the domain. No Stripe
  change is needed.

## The one real trap: scheduled jobs

`vercel.json` holds 20 scheduled jobs: Blue maintenance, commit/news/college alerts, result links
and digests, SI rankings, the placer index, family digest, questionnaire reminders, sign-up
health and others. Every project that deploys this repo schedules all of them. A second project
would send every email twice and run every import twice. They must run in **one** project only:
NC United's, for now.

---

## Phase 1: code (Claude) — DONE 23 Oct 2026

1. **Job guard.** `lib/scheduled-jobs.ts`. With `SCHEDULED_JOBS=off`, every `/api/cron/*` route
   returns "skipped" before doing anything. `lib/scheduled-jobs.test.ts` fails if any job in
   `vercel.json` lacks the check.
2. **Test address.** `next.recruitwrestlers.com` is treated as RecruitWrestlers: same brand, same
   pre-launch gate, never indexed.
3. **"Which project served this?"** `/api/admin/deployment` (admins only) reports the deployment
   URL, commit and whether scheduled jobs are on or off.
4. *Dropped:* tagging our own events with the site. Separate projects give separate Vercel
   analytics, which covers it.

## Phase 2: create the project (Matt, about 20 minutes)

1. **Vercel team.** Create, or open, the **Guild Ventures** team. Commercial use needs the Pro
   plan, $20 per member per month plus usage.
2. **Add New → Project.**
   - Import the GitHub repo `thehickeyclan/RecruitNC`. Vercel asks to give the Guild Ventures
     team access to the repo; allow it for this repo only.
   - Name the project `recruitwrestlers`. Framework: Next.js. Leave everything else at the defaults.
3. **Settings, copied in one paste.**
   - In NC United's project, on your Mac, run
     `vercel env pull .env.ncu-production --environment=production`.
   - In the new project, go to Settings → Environment Variables → **Import .env**, paste that
     file's contents and choose Production.
   - Delete the local file afterwards. It holds every secret.
4. **Add one setting to the new project only:** `SCHEDULED_JOBS` = `off`.
5. **Turn off scheduled jobs.** If Settings → Cron Jobs offers it, also **disable cron jobs** on the
   new project. That is belt and braces with step 4.
6. **Deploy** the new project once.

Every setting is copied unchanged. Admin lives on recruitwrestlers.com and still runs NC United's
tools (Blue, store), so NC United's Stripe keys stay in the new project too.

## Phase 3: test on next.recruitwrestlers.com (Matt adds the address, Claude tests)

1. New project → Settings → Domains → add `next.recruitwrestlers.com`.
2. GoDaddy (recruitwrestlers.com DNS): add the CNAME record Vercel shows. It is usually `next` →
   `cname.vercel-dns.com`.
3. Supabase → Authentication → URL Configuration → Redirect URLs: add
   `https://next.recruitwrestlers.com/**`.
4. Claude then checks on next.recruitwrestlers.com:
   - sign-in
   - the home page
   - profiles, rankings and the Command Center
   - /membership and a checkout start
   - admin and Alan's board
   - the privacy page
   - the full brand audit
   - the "which project" endpoint, which should name `recruitwrestlers`
   - Vercel's cron log for the new project, which should show no jobs running

## Phase 4: the switch (Matt, about 10 minutes, any time before launch)

1. **New project → Domains → add `recruitwrestlers.com` and `www.recruitwrestlers.com`.**
   - The domains belong to another team, so Vercel shows a **TXT verification record**.
   - Add it at GoDaddy. Vercel then moves the domains, and the old project loses them automatically.
2. **Also move `recruit.wrestlingguild.com`** the same way. It only forwards to
   recruitwrestlers.com. The rest of wrestlingguild.com stays where it is.
3. Claude confirms on the live address:
   - the "which project" endpoint now names `recruitwrestlers`
   - sign-in, the membership page and admin all work
   - a test webhook from Guild Ventures' Stripe dashboard reaches the new project
   - NC United's site is untouched

**Rollback:** add the domains back to the old project the same way. Nothing in NC United's project
changes during the move, so it is always ready to take them back.

## Phase 5: afterwards

- **Analytics.** Turn on Web Analytics in the new project. From then on it counts only
  recruitwrestlers.com.
- **Phase 2 copies are now independent.** A change to one project's settings does not reach the
  other. When a secret is rotated (Supabase, OpenAI, Resend, Twilio), update it in **both**.
  Claude can list the differences between the two on request (names only, never values).
- **Every merge to main deploys both projects.** That means double build minutes, and one deploy
  can be Ready a few minutes before the other.
- **Later, optional:** move the recruiting-only scheduled jobs (SI rankings, placer index, family
  digest, questionnaire reminders) to the new project. Each job moves by changing which project
  has `SCHEDULED_JOBS=off` for it; that needs a per-job setting first.
- **Separate decision:** moving the Supabase database into Guild Ventures' ownership. It is not
  needed for this move.
