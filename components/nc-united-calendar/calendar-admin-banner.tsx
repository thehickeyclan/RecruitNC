"use client"

import { Calendar, Settings } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { useAuth } from "@/contexts/auth-context"

/**
 * Shown on /calendar when the user is an admin (user_profiles.is_admin).
 * Full create/edit lives at /admin/calendar (secured API + service role).
 */
export function CalendarAdminBanner() {
  const { isAdmin, isLoading } = useAuth()
  if (isLoading || !isAdmin) return null

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-950">
        <Calendar className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden />
        You’re signed in as an admin — create and edit events in calendar admin (drop-in checkout uses Stripe on practice
        events).
      </p>
      <HardLink
        href="/admin/calendar"
        className="inline-flex items-center gap-2 rounded-md bg-[#003366] px-4 py-2 text-sm font-semibold text-white shadow-sm"
      >
        <Settings className="h-4 w-4" aria-hidden />
        Calendar admin
      </HardLink>
    </div>
  )
}
