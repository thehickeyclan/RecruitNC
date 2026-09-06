"use client"

import { useEffect, useState } from "react"
import { Eye, Lock, Loader2 } from "lucide-react"
import Link from "next/link"

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
          <p className="mt-2 text-xs text-white/40">
            21 college coaches used the site this year. Profiles with film, a GPA and an intended
            major are the ones they open.
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
            {total === 1 ? "" : "s"}
            {data.recentViews > 0 ? ` · ${data.recentViews} in the last 30 days` : ""}
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.schools.map((s) => (
              <li
                key={s.school}
                className="flex flex-wrap items-baseline gap-x-2 rounded-sm bg-white/5 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-white">{s.school}</span>
                <span className="text-xs text-white/40">
                  {s.views} view{s.views === 1 ? "" : "s"}
                </span>
                <span className="ml-auto font-mono text-xs text-white/50">
                  {new Date(s.lastViewedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
          {/* Says what is deliberately not shown, so nobody assumes we are hiding a name by accident. */}
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">
            Programs are named; individual coaches are not.
          </p>
        </div>
      )}
    </div>
  )
}
