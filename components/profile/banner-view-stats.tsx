"use client"

import { useEffect, useState } from "react"
import { Eye } from "lucide-react"

type Stats = {
  totalViews: number
  uniqueViewers: number
  collegeCoachViews: number
  distinctCollegeCoaches: number
}

/**
 * The view counts, small, in the banner.
 *
 * They already have a card further down the page, four big numbers in boxes. That card is the
 * right place to read them and the wrong place to notice them: an owner opening their own page
 * sees the banner and has to scroll past the results to find out whether anybody looked.
 *
 * So the same numbers appear here at the size of a caption. Only the owner and admins see it -
 * the endpoint refuses anybody else, which is why this can render on a page coaches also read
 * without checking anything itself.
 */
export function BannerViewStats({ athleteId, className }: { athleteId: string; className?: string }) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/athletes/${athleteId}/profile-views`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stats?: Stats } | null) => !cancelled && setStats(d?.stats ?? null))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (!stats || stats.totalViews === 0) return null

  const bits: Array<{ value: number; label: string; gold?: boolean }> = [
    { value: stats.totalViews, label: stats.totalViews === 1 ? "view" : "views" },
    { value: stats.uniqueViewers, label: "signed-in" },
  ]
  if (stats.distinctCollegeCoaches > 0) {
    bits.push({
      value: stats.distinctCollegeCoaches,
      label: stats.distinctCollegeCoaches === 1 ? "college program" : "college programs",
      gold: true,
    })
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
        <Eye className="h-3 w-3 text-white/35" aria-hidden />
        {bits.map((b, i) => (
          <span key={b.label} className="whitespace-nowrap">
            {i > 0 && <span className="mr-3 text-white/20">·</span>}
            <span className={b.gold ? "font-bold tabular-nums text-[#D3B574]" : "font-bold tabular-nums text-white/70"}>
              {b.value.toLocaleString()}
            </span>{" "}
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}
