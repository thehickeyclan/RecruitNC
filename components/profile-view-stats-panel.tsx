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
  children,
}: {
  athleteId: string
  className?: string
  adminView?: boolean
  /**
   * The college programs that viewed - the list and the subscription that names them
   * (CoachViewsPanel). One panel for "who's viewing you": the counts, then who.
   */
  children?: React.ReactNode
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

  // Not authorized, or the request failed: nothing.
  if (!stats) return null

  /*
   * No views yet: say so, with the one thing that changes it. The merged panel used to vanish
   * here, and with it the advice the college-programs panel gave a family with nothing to show.
   */
  if (stats.totalViews === 0) {
    return (
      <Card className={cn("profile-card border-t-4 border-t-[#D3B574] shadow-md", className)} data-section="profile-views">
        <div className="profile-card-body p-6">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-[#D3B574]" />
            <h2 className="text-lg font-bold text-white">{adminView ? "Profile Views" : "Who's Viewing You"}</h2>
          </div>
          <p className="mt-3 text-sm text-white/70">No college coach has viewed this profile yet.</p>
          <p className="mt-1 text-sm text-white/50">
            Profiles with film, a GPA and an intended major are the ones coaches open.
          </p>
        </div>
      </Card>
    )
  }

  const { last30 } = stats
  const hsClubCoachViews = Math.max(0, stats.coachViews - stats.collegeCoachViews)
  const distinctHsClubCoaches = Math.max(0, stats.distinctCoaches - stats.distinctCollegeCoaches)
  const coachLine =
    stats.distinctCollegeCoaches > 0
      ? `${stats.collegeCoachViews.toLocaleString()} ${stats.collegeCoachViews === 1 ? "view" : "views"} from ${stats.distinctCollegeCoaches} college ${stats.distinctCollegeCoaches === 1 ? "coach" : "coaches"}`
      : distinctHsClubCoaches > 0
        ? `${hsClubCoachViews.toLocaleString()} ${hsClubCoachViews === 1 ? "view" : "views"} from ${distinctHsClubCoaches} HS/club ${distinctHsClubCoaches === 1 ? "coach" : "coaches"}`
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
        {stats.distinctCollegeCoaches === 0 ? <p className="text-sm text-white/70">{coachLine}</p> : null}

        {/* The two numbers a family acts on. Unique viewers and every coach view, high school and
            club included, sat beside them as equals and buried the one that matters. */}
        <div className="grid grid-cols-2 gap-3">
          <Stat value={stats.totalViews} label="Total views" sub={sinceLabel ? `Since ${sinceLabel}` : undefined} />
          <Stat
            value={stats.distinctCollegeCoaches}
            label="College coaches"
            sub={`${stats.collegeCoachViews} ${stats.collegeCoachViews === 1 ? "view" : "views"}`}
            tone="gold"
          />
        </div>
        {stats.uniqueViewers > 0 || hsClubCoachViews > 0 ? (
          <p className="text-xs text-white/45">
            {stats.uniqueViewers.toLocaleString()} signed-in {stats.uniqueViewers === 1 ? "viewer" : "viewers"}
            {distinctHsClubCoaches > 0
              ? ` · ${distinctHsClubCoaches} high school or club ${distinctHsClubCoaches === 1 ? "coach" : "coaches"}`
              : ""}
            .
          </p>
        ) : null}

        {last30.totalViews > 0 && (
          <p className="text-xs text-white/45">
            Last 30 days: {last30.totalViews.toLocaleString()} {last30.totalViews === 1 ? "view" : "views"}
            {last30.coachViews > 0 && `, ${last30.coachViews} from coaches`}
            {last30.distinctCollegeCoaches > 0 &&
              ` (${last30.distinctCollegeCoaches} college ${last30.distinctCollegeCoaches === 1 ? "coach" : "coaches"})`}
            .
          </p>
        )}

        {children}

        <p className="text-xs text-white/35">
          {adminView
            ? "Families see college programs with a subscription; individual coaches are never named."
            : "Individual coaches are never named — so they keep browsing freely."}
        </p>
      </div>
    </Card>
  )
}
