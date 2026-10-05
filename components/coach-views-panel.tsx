"use client"

import { useEffect, useState } from "react"
import { Eye, Lock, Loader2 } from "lucide-react"
import Link from "next/link"
import { groupCoachVisits } from "@/lib/coach-view-visits"

/**
 * "Which college programs looked at you" — on the athlete's own profile.
 *
 * Free shows the count, paid shows the programs. That split is deliberate: the count proves
 * there is something real behind the paywall, which is what makes subscribing feel like
 * unlocking rather than gambling.
 *
 * Renders nothing for a stranger — the endpoint refuses them anyway, and who is recruiting a
 * particular minor is not something to hint at on a public page.
 *
 * The empty state is the common one. 271 coach views spread over 113 athletes means most
 * wrestlers have none, so it says so plainly and turns the gap into the nudge that fills in
 * the profile, rather than an empty panel somebody feels cheated by.
 */
type Locked = { locked: true; hasViews: boolean; programCount: number; totalViews: number }
type Unlocked = {
  locked: false
  schools: Array<{ school: string; lastViewedAt: string; views: number }>
  /** Every view, newest first, all time. `school` is null when the address is not placeable. */
  visits: Array<{ school: string | null; at: string }>
  totalViews: number
  distinctCoaches: number
  recentViews: number
}

export function CoachViewsPanel({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<Locked | Unlocked | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/athletes/${encodeURIComponent(athleteId)}/coach-views`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setData(d))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [athleteId])

  // Signed out, a stranger, or an error: show nothing rather than an empty box.
  if (loading || !data) return null

  const total = data.totalViews

  return (
    <div className="rounded-sm border border-white/10 bg-[#0f1c2e] p-5">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-[#D3B574]" />
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">
          College coach views
        </h3>
      </div>

      {total === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-white/60">No college coach has viewed this profile yet.</p>
          {/*
            * The advice, without the audience size.
            *
            * This used to open with how many college coaches had used the site - a true number
            * and a self-defeating one. A family reading "no coach has viewed this profile yet"
            * followed by a small headcount concludes nobody is looking and stops filling the
            * page in, which is the opposite of what the panel is for. What they can act on is
            * what the coaches who do visit actually open.
            */}
          <p className="mt-2 text-xs text-white/40">
            Profiles with film, a GPA and an intended major are the ones coaches open.
          </p>
        </div>
      ) : data.locked ? (
        <div className="mt-3">
          <p className="text-sm text-white/80">
            <span className="text-2xl font-black text-[#D3B574]">{data.programCount}</span>{" "}
            college program{data.programCount === 1 ? " has" : "s have"} viewed this profile
            {total > data.programCount ? ` — ${total} views in total` : ""}.
          </p>
          <div className="mt-3 space-y-1.5" aria-hidden>
            {Array.from({ length: Math.min(data.programCount, 3) }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-sm bg-white/5 px-3 py-2">
                <Lock className="h-3 w-3 shrink-0 text-white/30" />
                <span className="h-3 w-32 rounded-sm bg-white/10" />
              </div>
            ))}
          </div>
          <Link
            href="/subscribe"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-sm bg-[#B31B1B] px-4 text-sm font-bold text-white hover:bg-[#8f1616]"
          >
            See which programs — $9.99/mo
          </Link>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-white/60">
            {data.schools.length} program{data.schools.length === 1 ? "" : "s"} · {total} view
            {total === 1 ? "" : "s"} · all time
          </p>
          {/*
            * One row per visit, newest first - not one per programme, and not one per page load.
            *
            * Grouping by programme hid "when": a programme that looked three times in March and
            * once last night read the same as one that looked four times in March. Listing every
            * view kept "when" but turned one coach reloading a page into four rows. A visit is a
            * programme's views inside 24 hours (lib/coach-view-visits.ts), so the list still
            * answers "has anything happened since I last checked" without the noise.
            */}
          <ul className="mt-2 space-y-1.5">
            {groupCoachVisits(data.visits).map((v, i) => (
              <li
                key={`${v.last}-${i}`}
                className="flex flex-wrap items-baseline gap-x-2 rounded-sm bg-white/5 px-3 py-2 text-sm"
              >
                <span className={v.school ? "font-semibold text-white" : "font-semibold text-white/50"}>
                  {v.school ?? "A college program"}
                </span>
                {v.views > 1 ? (
                  <span className="rounded-sm bg-[#D3B574]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#D3B574]">
                    {v.views} views
                  </span>
                ) : null}
                <span className="ml-auto font-mono text-xs text-white/50">
                  {new Date(v.last).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}
                  {new Date(v.last).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
