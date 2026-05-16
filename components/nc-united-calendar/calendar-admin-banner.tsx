"use client"

import { Settings } from "lucide-react"
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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1e3a5f] bg-[#0F1E32] px-4 py-3">
      <p className="text-sm text-gray-400">
        Admin access — manage events, drop-ins, and practices.
      </p>
      <HardLink
        href="/admin/calendar"
        className="inline-flex items-center gap-2 rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-semibold text-[#0A1628] transition-colors hover:bg-[#c4a665]"
      >
        <Settings className="h-4 w-4" aria-hidden />
        Manage Calendar
      </HardLink>
    </div>
  )
}
