import "server-only"

import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { currentClassYears } from "@/lib/class-years"
import { isInternalAccount } from "@/lib/internal-accounts"
import { inState } from "@/lib/recruiting/states"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"
import data from "@/lib/college-programs/programs-2026-27.json"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"

/**
 * The numbers the national homepage quotes, counted from the database rather than typed in, so the
 * page cannot overstate them. Our own staff, test and App Store review accounts are left out
 * (lib/internal-accounts.ts). Refreshed hourly.
 */
export type NationalStats = {
  /** Current high school classes in live states. */
  wrestlers: number
  /** Approved college coaches, not ours. */
  coaches: number
  /** Their programs. */
  programs: number
  /** Programs whose coaches have opened a wrestler's profile here. */
  programsViewing: number
  /** Every college program on the map. */
  collegePrograms: number
}

const COACH_ROLES = ["college_coach", "college-coach"]

async function build(): Promise<NationalStats> {
  const admin = createAdminClient()
  const years = currentClassYears()

  const live = RECRUITING_BRAND.states.filter((s) => s.live).map((s) => s.code)
  const counts = await Promise.all(
    live.map(async (code) => {
      const { count } = await inState(admin.from("athletes").select("id", { count: "exact", head: true }), code)
        .gte("graduationyear", years[0]!)
        .lte("graduationyear", years[years.length - 1]!)
      return count ?? 0
    }),
  )

  const { data: coachRows } = await admin
    .from("user_profiles")
    .select("user_id, email, school_id, is_admin")
    .in("role", COACH_ROLES)
    .eq("verification_status", "approved")
  const coaches = (coachRows ?? []).filter((c) => c.is_admin !== true && !isInternalAccount(c.email as string | null))
  const schoolOf = new Map(coaches.map((c) => [String(c.user_id), c.school_id ? String(c.school_id) : null]))

  const viewing = new Set<string>()
  const ids = [...schoolOf.keys()]
  for (let i = 0; i < ids.length; i += 50) {
    for (let from = 0; ; from += 1000) {
      const { data: views } = await admin
        .from("user_analytics")
        .select("user_id")
        .eq("event_type", "profile_view")
        .in("user_id", ids.slice(i, i + 50))
        .range(from, from + 999)
      for (const v of views ?? []) {
        const school = schoolOf.get(String(v.user_id))
        if (school) viewing.add(school)
      }
      if (!views || views.length < 1000) break
    }
  }

  return {
    wrestlers: counts.reduce((a, b) => a + b, 0),
    coaches: coaches.length,
    programs: new Set([...schoolOf.values()].filter(Boolean)).size,
    programsViewing: viewing.size,
    collegePrograms: (data.schools as unknown[]).length + ANNOUNCED_PROGRAMS.length,
  }
}

export const loadNationalStats = unstable_cache(build, ["national-stats", "v1"], { revalidate: 3600 })
