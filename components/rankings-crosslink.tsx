"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Trophy } from "lucide-react"

/**
 * Tell a coach reading the directory that the rankings exist.
 *
 * A verified coach lands on the boards when he signs in, and from there the directory is the
 * other half of the job - the boards say who is good, the profiles say what they did. Neither
 * page mentioned the other, so a coach who navigated away from the rankings had no way back
 * except the menu.
 */
export function RankingsCrosslink() {
  const [show, setShow] = useState(false)
  const [isCoach, setIsCoach] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/me/ranking-access", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setShow(Boolean(d.hasRankings))
        setIsCoach(Boolean(d.isCoach))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!show) return null

  return (
    <a
      href="/public-rankings"
      className="mx-auto mb-6 flex max-w-4xl items-center gap-3 rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 px-4 py-3 transition-colors hover:bg-[#D3B574]/20"
    >
      <Trophy className="h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
      <span className="min-w-0 flex-1 text-sm text-white">
        <span className="font-semibold">
          {isCoach ? "Ranked prospects, by class" : "You have rankings access"}
        </span>
        <span className="ml-2 text-white/60">
          Class boards for 2027, 2028 and 2029, and the Top 75 College Prospects.
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden />
    </a>
  )
}
