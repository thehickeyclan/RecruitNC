/**
 * College coach usage (rebuilt 4 November 2026 to Matt's spec).
 *
 * Programs and coaches at the top, with how many of each were active in the last 30 days. Then
 * the four lines that say whether adoption is growing - programs, coaches, profile views and
 * wrestlers starred - over a window you pick, boys or girls. Then the wrestlers college coaches
 * are actually opening, by class and gender.
 *
 * Recruiting needs came off this page the same day: it is about whether coaches are here and
 * using it, and the needs counts were answering a different question.
 *
 * Programs are named; a coach never is. Admins, and the business grant.
 */
import Link from "next/link"
import { redirect } from "next/navigation"

import { BusinessChart } from "@/components/admin/business-chart"
import { businessData } from "@/lib/business/cache"
import { requireBusinessViewer } from "@/lib/business/require-business-viewer"
import { type Bucket, type Filters, type Gender, distinctSeries, mostViewed, series } from "@/lib/business/metrics"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const metadata = { title: "Coach usage | Admin" }

const PAGE = "/admin/coach-usage"
const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"
const th = "py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-white/50"
const td = "border-t border-white/10 py-2 pr-4 tabular-nums"

/** The windows Matt asked for. Short ones count by day, or a week would be a single bar. */
const WINDOWS: Array<{ key: string; label: string; days: number | null; bucket: Bucket; under: string }> = [
  { key: "7", label: "Week", days: 7, bucket: "day", under: "last 7 days" },
  { key: "30", label: "30 days", days: 30, bucket: "day", under: "last 30 days" },
  { key: "90", label: "90 days", days: 90, bucket: "day", under: "last 90 days" },
  { key: "182", label: "6 months", days: 182, bucket: "week", under: "last 6 months" },
  { key: "365", label: "Year", days: 365, bucket: "week", under: "last year" },
  { key: "all", label: "All time", days: null, bucket: "week", under: "all time" },
]

const DEFAULTS: Record<string, string> = { window: "90", gender: "all", year: "all" }
const EVER = { from: "2015-01-01", to: "2100-01-01" }
/** Where an all-time chart starts drawing: the first coach view we ever recorded. */
const EARLIEST = "2026-02-03"

const dayStr = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10)

export default async function CoachUsagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const auth = await requireBusinessViewer(PAGE)
  if (!auth.ok) redirect(auth.status === 401 ? `/auth/signin?returnTo=${encodeURIComponent(PAGE)}` : "/")

  const sp = await searchParams
  const data = await businessData()

  const win = WINDOWS.find((w) => w.key === sp.window) ?? WINDOWS.find((w) => w.key === DEFAULTS.window)!
  const gender: Gender | "all" = sp.gender === "Male" || sp.gender === "Female" ? sp.gender : "all"
  const classYear = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : "all"
  const filters: Filters = { state: "all", gender, site: "all" }

  const today = new Date().toISOString().slice(0, 10)
  const window = { from: win.days ? dayStr(win.days) : EARLIEST, to: today, bucket: win.bucket }
  const views = data.events.coach_views
  const stars = data.events.coach_stars

  // The four lines.
  const lines = [
    distinctSeries("coach_views", "College programs", views, data.dims, filters, window, (e) => e.by),
    distinctSeries("coach_views", "College coaches", views, data.dims, filters, window, (e) => e.byUser),
    series("coach_views", views, data.dims, filters, window),
    distinctSeries("coach_stars", "Wrestlers starred", stars, data.dims, filters, window, (e) => e.athleteId),
  ]
  const ever = [
    distinctSeries("coach_views", "College programs", views, data.dims, filters, EVER, (e) => e.by),
    distinctSeries("coach_views", "College coaches", views, data.dims, filters, EVER, (e) => e.byUser),
    series("coach_views", views, data.dims, filters, EVER),
    distinctSeries("coach_stars", "Wrestlers starred", stars, data.dims, filters, EVER, (e) => e.athleteId),
  ]

  // The tiles: everything we have ever seen, and what moved in the last 30 days.
  const last30 = { from: dayStr(30), to: today, bucket: "day" as Bucket }
  const recentActivity = [...views, ...stars]
  // The tiles follow the gender chip too, so they have to say which wrestlers they mean.
  const whom = gender === "Female" ? "a girl" : gender === "Male" ? "a boy" : "a wrestler"
  const tiles = [
    { n: ever[0].total, l: "College programs", note: `have opened ${whom}` },
    { n: ever[1].total, l: "College coaches", note: `have opened ${whom}` },
    { n: distinctSeries("coach_views", "p", recentActivity, data.dims, filters, last30, (e) => e.by).total, l: "Programs active", note: "in the last 30 days" },
    { n: distinctSeries("coach_views", "c", recentActivity, data.dims, filters, last30, (e) => e.byUser).total, l: "Coaches active", note: "in the last 30 days" },
  ]

  // The wrestlers being opened, with names fetched only for the ones we are about to show.
  const top = mostViewed(views, data.dims, { ...filters, classYear }, window, 25)
  const names = new Map<string, { name: string; school: string | null }>()
  if (top.length) {
    const admin = createAdminClient()
    const { data: rows } = await admin.from("athletes").select('id, name, "firstName", "lastName", highschool').in("id", top.map((t) => t.athleteId))
    for (const r of rows ?? []) {
      const full = String(r.name ?? "").trim() || [r.firstName, r.lastName].filter(Boolean).join(" ")
      names.set(String(r.id), { name: full || "Unnamed", school: (r.highschool as string | null) ?? null })
    }
  }

  const years = [...new Set([...data.dims.values()].map((d) => d.classYear).filter((y): y is number => Boolean(y)))].sort()
  const href = (patch: Partial<Record<"window" | "gender" | "year", string>>) => {
    const next = { window: sp.window, gender: sp.gender, year: sp.year, ...patch }
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v && v !== DEFAULTS[k]) q.set(k, v)
    return `${PAGE}${q.size ? `?${q}` : ""}`
  }
  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-[#A3E635] text-[#060f1f]" : "bg-white/10 text-white/75 hover:bg-white/15"}`

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/business" className="text-sm font-bold text-[#A3E635] hover:underline">
          ← Business
        </Link>
        <h1 className="mt-3 text-3xl font-black">College coach usage</h1>
        <p className="mt-1 text-sm text-white/55">
          Whether college coaches are here and using it. Programs are named; a coach never is. Coach views have been
          recorded since 3 February 2026.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.l} className={card}>
              <p className="text-3xl font-black tabular-nums">{t.n.toLocaleString()}</p>
              <p className="text-sm font-semibold text-white/70">{t.l}</p>
              <p className="mt-0.5 text-xs text-white/40">{t.note}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {WINDOWS.map((w) => (
            <Link key={w.key} href={href({ window: w.key })} className={chip(win.key === w.key)}>
              {w.label}
            </Link>
          ))}
          <span className="mx-1 text-white/25">|</span>
          {([
            ["all", "Boys and girls"],
            ["Male", "Boys"],
            ["Female", "Girls"],
          ] as const).map(([k, label]) => (
            <Link key={k} href={href({ gender: k })} className={chip(gender === k)}>
              {label}
            </Link>
          ))}
        </div>
        {gender !== "all" ? (
          <p className="mt-2 text-xs text-white/40">
            Narrowed by the wrestler who was looked at, so &ldquo;college programs&rdquo; here means programs that have
            opened {gender === "Female" ? "a girl" : "a boy"}.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {lines.map((s, i) => (
            <BusinessChart key={s.label} series={s} windowLabel={win.under} bucket={win.bucket} allTime={win.days ? ever[i].total : undefined} />
          ))}
        </div>

        <h2 className="mt-10 text-xl font-black">Wrestlers college coaches are opening</h2>
        <p className="mt-1 text-sm text-white/55">{win.under}, most opened first.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={href({ year: "all" })} className={chip(classYear === "all")}>
            All classes
          </Link>
          {years.map((y) => (
            <Link key={y} href={href({ year: String(y) })} className={chip(classYear === y)}>
              {y}
            </Link>
          ))}
        </div>

        <div className={`${card} mt-3`}>
          {top.length === 0 ? (
            <p className="text-sm text-white/55">No coach opened a wrestler matching these filters in this window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Wrestler</th>
                  <th className={th}>School</th>
                  <th className={th}>Class</th>
                  <th className={th}>Views</th>
                  <th className={th}>Programs</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r) => {
                  const who = names.get(r.athleteId)
                  const dim = data.dims.get(r.athleteId)
                  return (
                    <tr key={r.athleteId}>
                      <td className={`${td} font-semibold`}>
                        <Link href={`/athletes/${r.athleteId}`} className="hover:text-[#A3E635]">
                          {who?.name ?? r.athleteId}
                        </Link>
                      </td>
                      <td className={`${td} text-white/60`}>{who?.school ?? "–"}</td>
                      <td className={`${td} text-white/60`}>{dim?.classYear ?? "–"}</td>
                      <td className={td}>{r.views}</td>
                      <td className={td}>{r.programs}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
