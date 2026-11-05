import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { completenessFromRow } from "@/lib/profile-completeness"
import { familyStateForUser, plansForState } from "@/lib/recruiting/plans-for-state"

export type UpgradeWrestler = {
  id: string
  firstName: string
  /** Profile complete, 0-100. */
  percent: number
  /** The first open item's editor (?edit= on the profile), or null when the profile is complete. */
  todoEdit: string | null
  /** College programs that viewed this wrestler's profile. A count only: names are Insider's. */
  programsViewed: number
}

export type FamilyUpgrade = {
  wrestlers: UpgradeWrestler[]
  /** Insider is the rankings: sold only where we rank (lib/recruiting/plans-for-state.ts). */
  insiderOffered: boolean
}

/**
 * What the Command Center's plans page shows a signed-in family with no plan (Matt, 5 Nov 2026):
 * their own wrestler's numbers, not the page written for strangers. Wrestlers still in high school
 * only, as in the Command Center itself (app/my-recruiting/load.ts). Never throws: a part that
 * fails shows as nothing.
 */
export async function loadFamilyUpgrade(admin: SupabaseClient, userId: string): Promise<FamilyUpgrade> {
  const [ids, state] = await Promise.all([familyAthleteIds(admin, userId).catch(() => [] as string[]), familyStateForUser(admin, userId).catch(() => null)])
  const insiderOffered = plansForState(state).insider
  if (!ids.length) return { wrestlers: [], insiderOffered }
  const { data: rows } = await admin
    .from("athletes")
    .select("id, name, firstName, graduationyear, highschool, photourl, academic_gpa, academic_sat, academic_act, highlight_video_url, phone, contactEmail")
    .in("id", ids)
    .order("graduationyear", { ascending: true })
  const graduated = mostRecentGraduatedClassYear()
  const inSchool = (rows ?? []).filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
  const views = await Promise.all(inSchool.map((a) => getCoachViewsForAthlete(admin, String(a.id)).catch(() => null)))
  const wrestlers = inSchool.map((a, i) => {
    const c = completenessFromRow(a as Record<string, unknown>)
    return {
      id: String(a.id),
      firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0] || "Your wrestler",
      percent: c.percent,
      todoEdit: c.items.find((item) => !item.done)?.edit ?? null,
      programsViewed: views[i]?.schools.length ?? 0,
    }
  })
  return { wrestlers, insiderOffered }
}
