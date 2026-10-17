import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { messagingRule, type MessagingCompliance } from "@/lib/coach-messages-compliance"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { mapSchoolIdFor } from "@/lib/college-programs/load"
import data from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"

const SCHOOLS = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))

/**
 * The compliance note for this coach writing to this wrestler. The coach's level is the one of
 * their college's program for the wrestler's team: a coach writing to a girl is held to the
 * college's women's program, to a boy its men's.
 */
export async function coachMessagingCompliance(admin: SupabaseClient, coachUserId: string, athleteId: string): Promise<MessagingCompliance> {
  const [{ data: profile }, { data: athlete }] = await Promise.all([
    admin.from("user_profiles").select("school_id").eq("user_id", coachUserId).maybeSingle(),
    admin.from("athletes").select('"firstName", name, gender, graduationyear').eq("id", athleteId).maybeSingle(),
  ])
  const firstName = String(athlete?.firstName ?? "").trim() || String(athlete?.name ?? "").trim().split(" ")[0] || "This wrestler"
  const gender = athlete?.gender ? String(athlete.gender) : null
  const team = /^f/i.test(String(gender ?? "")) ? "womens" : "mens"

  let division: CollegeMapSchool["programs"][number]["division"] | null = null
  let divisionNote: string | null = null
  if (profile?.school_id) {
    const { data: school } = await admin.from("schools").select("name").eq("id", profile.school_id).maybeSingle()
    const mapped = school?.name ? SCHOOLS.get(mapSchoolIdFor(String(school.name)) ?? "") : undefined
    // The program for the wrestler's team; a college without one is still at its own level.
    const program = mapped?.programs.find((p) => p[team]) ?? mapped?.programs[0]
    division = program?.division ?? null
    if (mapped && !mapped.programs.some((p) => p[team])) divisionNote = `${mapped.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()} has no ${team === "womens" ? "women's" : "men's"} team on our list.`
  }
  return messagingRule({ division, divisionNote, gender, classYear: athlete?.graduationyear ? Number(athlete.graduationyear) : null, firstName })
}
