"use client"

/**
 * Profile Views: who is looking, for the wrestler's own family.
 *
 * The most important thing on the page to a family that has claimed its profile (Matt, 11 October
 * 2026) - so it sits open at the top, not behind a row. A family that does not subscribe still
 * watches the list grow: how many programs, when, how often, and a bar per week. Only the program
 * is withheld, and it is withheld by the server (lib/coach-profile-views.ts, teaseCoachViews), so
 * the blurred placeholder here covers nothing a browser could reveal.
 *
 * Programs are named, never the coach. Renders nothing for anyone the endpoint refuses.
 */
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Unlocked = {
  locked: false
  schools: Array<{ school: string; lastViewedAt: string; views: number; logo?: string | null }>
  visits: Array<{ school: string | null; at: string }>
  totalViews: number
}
type Locked = { locked: true; hasViews: boolean; programCount: number; totalViews: number; visits: Array<{ first: string; last: string; views: number }> }
type Views = Unlocked | Locked
type Stats = { totalViews: number; uniqueViewers: number; since: string | null }

const DAY = 86_400_000
const WEEKS = 8
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
const initials = (name: string) =>
  name
    .replace(/university|college|of|the|at/gi, " ")
    .split(/[\s&-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("")

function Logo({ school, logo }: { school: string; logo?: string | null }) {
  const [url, setUrl] = useState<string | null>(logo ?? null)
  useEffect(() => {
    // The server sends the program's logo with its name; the lookup by name is only a fallback.
    if (logo) return
    let cancelled = false
    fetch(`/api/logo-mappings/by-entity/college/${encodeURIComponent(school)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { success?: boolean; logo_url?: string } | null) => {
        if (!cancelled && d?.success && d.logo_url) setUrl(d.logo_url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [school, logo])
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#1a3a5f] bg-white text-[11px] font-black text-[#0A1628]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain p-1" onError={() => setUrl(null)} />
      ) : (
        initials(school)
      )}
    </span>
  )
}

export function ProfileViewsBlock({ athleteId, athleteFirstName, className }: { athleteId: string; athleteFirstName: string; className?: string }) {
  const [views, setViews] = useState<Views | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    const json = (url: string) => fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    void json(`/api/athletes/${encodeURIComponent(athleteId)}/coach-views`).then((d) => !cancelled && setViews(d && typeof d.locked === "boolean" ? (d as Views) : null))
    void json(`/api/athletes/${encodeURIComponent(athleteId)}/profile-views`).then((d) => !cancelled && setStats(d?.ok ? (d.stats as Stats) : null))
    return () => {
      cancelled = true
    }
  }, [athleteId])

  const model = useMemo(() => {
    if (!views) return null
    const now = Date.now()
    // One entry per program for a subscriber; one per visit for everyone else, who has no programs to group by.
    const rows = views.locked
      ? [...views.visits].sort((a, b) => b.last.localeCompare(a.last)).map((v) => ({ school: null as string | null, last: v.last, views: v.views, logo: null as string | null }))
      : views.schools.map((s) => ({ school: s.school as string | null, last: s.lastViewedAt, views: s.views, logo: s.logo ?? null }))
    const stamps = views.locked ? views.visits.flatMap((v) => Array.from({ length: v.views }, () => v.last)) : views.visits.map((v) => v.at)
    const weeks = Array.from({ length: WEEKS }, () => 0)
    for (const at of stamps) {
      const ago = Math.floor((now - Date.parse(at)) / (7 * DAY))
      if (ago >= 0 && ago < WEEKS) weeks[WEEKS - 1 - ago]! += 1
    }
    return {
      programs: views.locked ? views.programCount : views.schools.length,
      rows,
      weeks,
      newThisWeek: rows.filter((r) => now - Date.parse(r.last) < 7 * DAY).length,
    }
  }, [views])

  if (!views || !model) return null
  const peak = Math.max(1, ...model.weeks)
  const shown = showAll ? model.rows : model.rows.slice(0, 5)
  const subscribe = `/rankings?plan=subscription&return=${encodeURIComponent(`/view-profile?id=${athleteId}`)}`

  return (
    <section id="college-views" aria-label="Profile views" className={cn("scroll-mt-24 rounded-xl border border-[#D3B574] bg-[#0f1c2e] p-4", className)}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="text-[40px] font-black leading-none tabular-nums text-[#D3B574]">{model.programs}</p>
          <p className="mt-1 text-sm font-bold text-white">
            college {model.programs === 1 ? "program has" : "programs have"} viewed {athleteFirstName}
          </p>
          {model.newThisWeek > 0 ? <p className="text-[13px] font-extrabold text-[#A7F3D0]">▲ {model.newThisWeek} new this week</p> : null}
        </div>
        {views.totalViews > 0 ? (
          <div className="min-w-[150px] flex-1">
            <div
              className="flex h-[54px] items-end gap-[5px]"
              role="img"
              aria-label={`College coach views per week for the last ${WEEKS} weeks, oldest first: ${model.weeks.join(", ")}`}
            >
              {model.weeks.map((n, i) => (
                <span
                  key={i}
                  className={cn("flex-1 rounded-t-[3px]", i === WEEKS - 1 ? "bg-[#D3B574]" : "bg-[#13294B]")}
                  style={{ height: `${Math.max(4, Math.round((n / peak) * 100))}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#6B829D]">
              <span>{WEEKS} weeks ago</span>
              <span>this week</span>
            </div>
          </div>
        ) : null}
        {stats ? (
          <div>
            <p className="text-xs text-[#A8BBD1]">All views</p>
            <p className="text-[19px] font-black leading-tight text-white tabular-nums">{stats.totalViews.toLocaleString()}</p>
            <p className="text-xs text-[#A8BBD1]">
              {stats.uniqueViewers} signed-in{stats.since ? ` · since ${new Date(stats.since).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
            </p>
          </div>
        ) : null}
      </div>

      {model.rows.length ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold tracking-[0.24em] text-[#D3B574]">WHO VIEWED</p>
          <ul>
            {shown.map((r, i) => (
              <li key={`${r.school ?? "p"}-${r.last}-${i}`} className="flex items-center gap-3 border-b border-[#1a3a5f] py-2 last:border-b-0">
                {r.school ? (
                  <Logo school={r.school} logo={r.logo} />
                ) : (
                  // Nothing is hidden under this: the server sent no program for it.
                  <span className="h-10 w-10 shrink-0 rounded-full bg-[#13294B] blur-[3px]" aria-hidden />
                )}
                <p className="min-w-0 text-sm">
                  {r.school ? (
                    <span className="font-bold text-white">{r.school}</span>
                  ) : (
                    <span className="select-none font-bold text-white/70 blur-[5px]" aria-label={views.locked ? "A college program" : "A college coach"}>
                      College program
                    </span>
                  )}
                  {Date.now() - Date.parse(r.last) < 7 * DAY ? (
                    <span className="ml-1.5 rounded bg-[#A7F3D0] px-1.5 text-[10px] font-black text-[#0A1628]">NEW</span>
                  ) : null}
                  <span className="block text-[13px] text-[#A8BBD1]">
                    {r.views} {r.views === 1 ? "view" : "views"} · {r.views === 1 ? "" : "last "}
                    {day(r.last)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          {model.rows.length > 5 ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-1 text-[13px] font-extrabold text-[#D3B574]">
              {showAll ? "Show fewer" : `See all ${model.rows.length}`}
            </button>
          ) : null}
          <p className="mt-2 text-xs text-[#A8BBD1]">Programs only; a coach&apos;s name is never shown.</p>
          <p className="mt-1 text-xs text-[#A8BBD1]">A view means a program looked, not an offer.</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#A8BBD1]">
          No college program has viewed this profile yet. Coaches open complete profiles first: add a highlight reel, GPA and test scores, and keep
          results current.
        </p>
      )}

      {views.locked && views.hasViews ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#1a3a5f] pt-3">
          <p className="max-w-[46ch] text-xs text-[#A8BBD1]">
            You always see how many programs are looking, and when. Subscribe to see which programs they are.
          </p>
          <Link href={subscribe} className="ncu-only rounded-lg bg-[#D3B574] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0A1628] hover:bg-[#c4a665]">
            See which programs · $9.99/mo
          </Link>
          <span className="guild-only">
            <span className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white/60">Program names: coming soon</span>
          </span>
        </div>
      ) : null}
    </section>
  )
}
