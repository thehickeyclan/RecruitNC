"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { COACH_PREVIEW_KEY, usesRecruitingShell } from "@/lib/recruiting/brand"

/**
 * Is this viewer working as a college coach?
 *
 * `isCoach` is a real coach account. `preview` is an admin who switched on "View as coach": the
 * coach's buttons and wording are shown so the screens can be reviewed, but an admin is not a
 * coach and cannot write to a family - `previewNotice` is what a compose box says instead.
 */
export function useCoachMode() {
  const { profile } = useAuth()
  const [flag, setFlag] = useState(false)
  useEffect(() => {
    try {
      setFlag(localStorage.getItem(COACH_PREVIEW_KEY) === "1")
    } catch {}
  }, [])
  const isCoach = usesRecruitingShell(profile)
  const preview = !isCoach && flag && (profile?.is_admin === true || profile?.role === "admin")
  return {
    isCoach,
    preview,
    actsAsCoach: isCoach || preview,
    previewNotice: preview
      ? "You are viewing as a coach from an admin account. Only a real college coach account can send a message to a family; sign in as one to test sending."
      : null,
  }
}
