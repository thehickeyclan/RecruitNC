"use client"

import { useEffect } from "react"
import { trackProfileView } from "@/lib/analytics-enhanced"

interface ProfileViewTrackerProps {
  athleteId: string
  athleteName: string
}

export function ProfileViewTracker({ athleteId, athleteName }: ProfileViewTrackerProps) {
  useEffect(() => {
    if (athleteId && athleteName) {
      trackProfileView(athleteId, athleteName)
    }
  }, [athleteId, athleteName])

  return null
}
