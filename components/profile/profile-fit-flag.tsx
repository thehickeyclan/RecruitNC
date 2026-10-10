"use client"

import { useEffect, useState } from "react"
import { FitBadge, type FitBadgeFlag } from "@/components/fit-badge"

/**
 * This wrestler against the viewing coach's perfect recruit, on the profile.
 *
 * Rendered only where the Compare button is - verified college coaches and admins - and shows
 * nothing until the program has set a standard. The pill links to the page where it is set, so a
 * coach who wonders why somebody missed can read the needs.
 */
export function ProfileFitFlag({ athleteId, className }: { athleteId: string; className?: string }) {
  const [flag, setFlag] = useState<FitBadgeFlag | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/coaches/program-fit/check?athlete=${encodeURIComponent(athleteId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { flag?: FitBadgeFlag | null } | null) => {
        if (!cancelled) setFlag(d?.flag ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [athleteId])
  if (!flag) return null
  return (
    <a href="/perfect-recruit" className={className} aria-label={`Your perfect recruit: ${flag.summary}`}>
      <FitBadge flag={flag} />
    </a>
  )
}
