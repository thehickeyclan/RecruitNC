import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { mapSchoolIdFor } from "@/lib/college-programs/load"

export type CollegeViews = { views: number; lastViewedAt: string }

/**
 * Which colleges' coaches have viewed the family's wrestlers, keyed by the college's id on the map,
 * so a college page and Compare can say "viewed Jake's profile" (Matt, 15 Oct 2026: coaches on the
 * same platform is the secret sauce). The program comes from the coach's school record, matched to
 * the map the same way "Coaches on RecruitNC" is; a view we cannot place is left out, never guessed.
 * For subscribers only, like every named view.
 */
export async function collegeViewsFor(admin: SupabaseClient, athleteIds: string[]): Promise<Map<string, CollegeViews>> {
  const out = new Map<string, CollegeViews>()
  const summaries = await Promise.all(athleteIds.map((id) => getCoachViewsForAthlete(admin, id).catch(() => null)))
  for (const s of summaries) {
    for (const school of s?.schools ?? []) {
      const id = mapSchoolIdFor(school.school)
      if (!id) continue
      const cur = out.get(id)
      out.set(id, {
        views: (cur?.views ?? 0) + school.views,
        lastViewedAt: cur && cur.lastViewedAt > school.lastViewedAt ? cur.lastViewedAt : school.lastViewedAt,
      })
    }
  }
  return out
}
