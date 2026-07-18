"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Eye, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "Who's looking at your profile" — shown to profile owners and admins.
 *
 * Counts, never identities: naming the coaches would make them browse less, which costs the
 * athlete the signal. The API enforces the same rule server-side; this component only ever
 * receives numbers.
 *
 * Renders nothing at all until there's something worth saying — a brand-new profile showing
 * a row of zeros reads as failure, which is the opposite of the point.
 */

type Stats = {
  totalViews: number
  uniqueViewers: number
  coachViews: number
  distinctCoaches: number
  collegeCoachViews: number
  distinctCollegeCoaches: number
  last30: { totalViews: number; coachViews: number; distinctCollegeCoaches: number }
  since: string | null
}

function Stat({
  value,
  label,
  sub,
  tone = "white",
}: {
  value: number
  label: string
  sub?: string
  tone?: "white" | "gold"
}) {
  return (
    <div className="rounded-lg border border-[#1e3a5f] bg-[#0f1c2e] p-4">
      <p className={cn("text-3xl font-bold tabular-nums", tone === "gold" ? "text-[#D3B574]" : "text-white")}>
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm font-semibold text-white/80">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-white/45">{sub}</p>}
    </div>
  )
}

export function ProfileViewStatsPanel({
  athleteId,
  className,
  adminView = false,
}: {
  athleteId: string
  className?: string
  adminView?: boolean
}) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/athletes/${athleteId}/profile-views`)
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { stats?: Stats }
        if (!cancelled) setStats(data.stats ?? null)
      } catch {
        // Non-owner (403) or a hiccup — stay silent rather than show a broken card.
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (athleteId) void run()
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (loading) {
    return (
      <Card className={cn("profile-card border-t-4 border-t-[#D3B574] shadow-md", className)} data-section="profile-views">
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
          <div className="flex items-center gap-3">
            <Eye className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">{adminView ? "Profile Views" : "Who's Viewing You"}</h2>
          </div>
        </div>
        <div className="profile-card-body flex items-center gap-2 p-8 text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading profile views…</span>
        </div>
      </Card>
    )
  }

  // Nothing to show, or not authorized.
  if (!stats || stats.totalViews === 0) return null

  const { last30 } = stats
  const coachLine =
    stats.distinctCollegeCoaches > 0
      ? `${stats.collegeCoachViews.toLocaleString()} ${stats.collegeCoachViews === 1 ? "view" : "views"} from ${stats.distinctCollegeCoaches} college ${stats.distinctCollegeCoaches === 1 ? "coach" : "coaches"}`
      : stats.distinctCoaches > 0
        ? `${stats.coachViews.toLocaleString()} ${stats.coachViews === 1 ? "view" : "views"} from ${stats.distinctCoaches} ${stats.distinctCoaches === 1 ? "coach" : "coaches"}`
        : "No coach views yet — coaches look most during signing periods."

  const sinceLabel = stats.since
    ? new Date(stats.since).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null

  return (
    <Card className={cn("profile-card border-t-4 border-t-[#D3B574] shadow-md", className)} data-section="profile-views">
      <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Eye className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">{adminView ? "Profile Views" : "Who's Viewing You"}</h2>
          </div>
          <span className="hidden flex-shrink-0 text-xs text-white/50 sm:block">
            {adminView ? "Admin view" : "Only you can see this"}
          </span>
        </div>
      </div>

      <div className="profile-card-body space-y-4 p-6 sm:p-8">
        <p className="text-sm text-white/70">{coachLine}</p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat value={stats.totalViews} label="Total views" sub={sinceLabel ? `Since ${sinceLabel}` : undefined} />
          <Stat value={stats.uniqueViewers} label="Unique viewers" sub="Signed-in" />
          <Stat value={stats.coachViews} label="Coach views" sub={`${stats.distinctCoaches} ${stats.distinctCoaches === 1 ? "coach" : "coaches"}`} tone="gold" />
          <Stat
            value={stats.distinctCollegeCoaches}
            label="College coaches"
            sub={`${stats.collegeCoachViews} ${stats.collegeCoachViews === 1 ? "view" : "views"}`}
            tone="gold"
          />
        </div>

        {last30.totalViews > 0 && (
          <p className="text-xs text-white/45">
            Last 30 days: {last30.totalViews.toLocaleString()} {last30.totalViews === 1 ? "view" : "views"}
            {last30.coachViews > 0 && `, ${last30.coachViews} from coaches`}
            {last30.distinctCollegeCoaches > 0 &&
              ` (${last30.distinctCollegeCoaches} college ${last30.distinctCollegeCoaches === 1 ? "coach" : "coaches"})`}
            .
          </p>
        )}

        <p className="text-xs text-white/35">
          {adminView
            ? "Athletes see counts, not names — so coaches keep browsing freely."
            : "Coaches are shown as counts, not names — so they keep browsing freely."}
        </p>
      </div>
    </Card>
  )
}
