/**
 * College coach usage, week by week (2 Nov 2026): coach adoption is the primary success metric.
 * Active coaches, profiles they reviewed, wrestlers they starred, and recruiting needs posted and
 * live - split RecruitWrestlers vs NC United by event_data.site (stamped from 1 Nov 2026; older
 * events show as Not tagged). Rules for who counts as a coach: lib/admin/coach-usage.ts.
 * Admins, and the business grant (lib/business/access.ts).
 */
import { redirect } from "next/navigation"

import { hasBusinessGrant } from "@/lib/business/access"

import { USAGE_SITES, collegeCoachIds, weeklyUsage, type AuthRow, type NeedRow, type ProfileRow, type SiteKey, type StarRow, type UsageEvent, type WeekCounts } from "@/lib/admin/coach-usage"
import { isLiveNeed } from "@/lib/recruiting/needs"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const metadata = { title: "Coach usage | Admin" }

const WEEKS = 4
const SITE_LABEL: Record<SiteKey, string> = { rw: "RecruitWrestlers", ncu: "NC United", app: "iPhone app", untagged: "Not tagged" }
const ROWS: Array<{ key: keyof WeekCounts; label: string; siteless?: boolean }> = [
  { key: "activeCoaches", label: "Active college coaches" },
  { key: "profilesReviewed", label: "Wrestlers' profiles reviewed" },
  { key: "profileViews", label: "Profile views" },
  { key: "starred", label: "Prospects starred", siteless: true },
  { key: "starringCoaches", label: "Coaches who starred", siteless: true },
  { key: "needsPosted", label: "Recruiting needs posted" },
]

type Admin = ReturnType<typeof createAdminClient>

async function paged<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function loadCoaches(admin: Admin): Promise<Set<string>> {
  const profiles = await paged<ProfileRow>((f, t) =>
    admin.from("user_profiles").select("user_id, email, role, profile_type, verified_coach, institution, is_admin").order("user_id").range(f, t),
  )
  const users: AuthRow[] = []
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? null, user_metadata: u.user_metadata ?? null })))
    if (data.users.length < 1000) break
  }
  return collegeCoachIds(profiles, users)
}

export default async function CoachUsagePage() {
  const { data: auth } = await (await createClient()).auth.getUser()
  if (!auth.user) redirect("/auth/signin?returnTo=%2Fadmin%2Fcoach-usage")
  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", auth.user.id).maybeSingle()
  // Full admins, and the business grant (lib/business/access.ts), which is all Rhett holds.
  if (!(me?.is_admin === true || me?.role === "admin") && !hasBusinessGrant(auth.user.app_metadata)) redirect("/")

  const now = new Date()
  const since = new Date(now.getTime() - WEEKS * 7 * 86_400_000).toISOString()
  const coaches = await loadCoaches(admin)
  const ids = [...coaches]
  const events: UsageEvent[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const part = ids.slice(i, i + 100)
    events.push(
      ...(await paged<UsageEvent>((f, t) =>
        admin.from("user_analytics").select("id, user_id, event_type, created_at, event_data").in("user_id", part).gte("created_at", since).order("id").range(f, t),
      )),
    )
  }
  const stars = await paged<StarRow>((f, t) => admin.from("college_coach_stars").select("id, coach_user_id, athlete_id, starred_at").gte("starred_at", since).order("id").range(f, t))
  const needsRead = await admin.from("college_recruiting_needs").select("posted_by, site, created_at, confirmed_at, cleared_at").limit(5000)
  const needs = (needsRead.error ? [] : needsRead.data ?? []) as NeedRow[]
  const live = needs.filter((n) => isLiveNeed({ confirmedAt: n.confirmed_at, clearedAt: n.cleared_at }))
  const liveBySite = (k: SiteKey) => live.filter((n) => (n.site === k ? true : k === "untagged" && !["rw", "ncu", "app"].includes(String(n.site)))).length
  const weeks = weeklyUsage({ coaches, events, stars, needs, now, weeks: WEEKS })
  const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"
  const shown = USAGE_SITES.filter((k) => k === "rw" || k === "ncu" || weeks.some((w) => Object.values(w.bySite[k]).some((v) => v > 0)) || liveBySite(k) > 0)

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">College coach usage</h1>
        <p className="mt-1 text-sm text-white/55">
          Coach adoption, week by week, RecruitWrestlers vs NC United. Sites are tagged from 1 Nov 2026; older events show as Not tagged. Stars carry no site.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: coaches.size, l: "College coach accounts" },
            { n: weeks[0]!.all.activeCoaches, l: "Active last 7 days" },
            { n: live.length, l: "Recruiting needs live" },
            { n: new Set(live.map((x) => x.posted_by)).size, l: "Coaches with live needs" },
          ].map((s) => (
            <li key={s.l} className={card}>
              <p className="text-3xl font-black tabular-nums">{s.n}</p>
              <p className="text-sm text-white/60">{s.l}</p>
            </li>
          ))}
        </ul>
        {needsRead.error ? <p className="mt-3 text-sm text-amber-300">Recruiting needs table not found yet: scripts/sql/college-recruiting-needs.sql has not been run.</p> : null}

        {weeks.map((w) => (
          <section key={w.since} className={`mt-8 ${card}`}>
            <h2 className="text-lg font-bold">
              {w.label} <span className="text-sm font-normal text-white/45">{w.since.slice(0, 10)} to {w.until.slice(0, 10)}</span>
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-white/50">
                    <th className="py-2 pr-4 font-semibold"> </th>
                    {shown.map((k) => (
                      <th key={k} className={`py-2 pr-4 text-right font-semibold ${k === "rw" ? "text-[#A3E635]" : k === "ncu" ? "text-[#D3B574]" : ""}`}>
                        {SITE_LABEL[k]}
                      </th>
                    ))}
                    <th className="py-2 pr-4 text-right font-semibold">All</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.key} className="border-t border-white/10">
                      <td className="py-2 pr-4 text-white/75">{r.label}</td>
                      {shown.map((k) => (
                        <td key={k} className="py-2 pr-4 text-right text-lg font-black tabular-nums">
                          {r.siteless ? <span className="text-white/30">–</span> : w.bySite[k][r.key]}
                        </td>
                      ))}
                      <td className="py-2 pr-4 text-right text-lg font-black tabular-nums">{w.all[r.key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-white/40">Active: any tracked page, profile, star or need in the week. A coach on both sites counts once under All.</p>
          </section>
        ))}

        <section className={`mt-8 ${card}`}>
          <h2 className="text-lg font-bold">Recruiting needs live now</h2>
          <div className="mt-3 flex flex-wrap gap-6">
            {shown.map((k) => (
              <p key={k}>
                <span className="text-2xl font-black tabular-nums">{liveBySite(k)}</span> <span className="text-sm text-white/60">{SITE_LABEL[k]}</span>
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
