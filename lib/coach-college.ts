import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isEduEmail } from "@/lib/coach-auto-approve"
import { suggestColleges } from "@/lib/college-match"

/**
 * Which college a coach belongs to, settled when they sign up.
 *
 * Coaches used to arrive with no college at all, and staff matched each one by hand from a
 * dropdown - for a college that was often not in it. The coach has already told us: they type
 * their college and most sign up on its .edu domain. So:
 *
 * - a college on file that matches what they typed or their domain is assigned;
 * - otherwise, on a .edu address, the college they typed is added and assigned - the domain is
 *   evidence the school is real;
 * - otherwise nothing: "NC Wrestling United" on a Gmail address is not a college to create.
 *
 * Staff still see every coach and can reassign on the users dashboard.
 */

type CollegeRow = { id: string; name: string; division?: string | null; logo_url?: string | null }

/**
 * The `schools` row a college maps to, created when missing.
 *
 * Coach portals key off `user_profiles.school_id`, which points at `schools`, while the canonical
 * list is `colleges`. This bridges the two by name - the same rule the admin editor always used.
 */
export async function schoolForCollege(
  admin: SupabaseClient,
  college: CollegeRow,
): Promise<{ id: string; name: string }> {
  const { data: found, error } = await admin
    .from("schools")
    .select("id, name")
    .ilike("name", college.name)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Failed to resolve college assignment: ${error.message}`)
  if (found) return found as { id: string; name: string }

  const inserted = await admin
    .from("schools")
    .insert({
      name: college.name,
      canonical_name: college.name,
      logo_url: college.logo_url || null,
      is_test: false,
      is_active: true,
      notes: "College institution created from canonical colleges table",
    })
    .select("id, name")
    .single()
  if (inserted.error || !inserted.data) {
    throw new Error(`Failed to create college portal assignment: ${inserted.error?.message ?? "no row"}`)
  }
  return inserted.data as { id: string; name: string }
}

export type CoachCollegeResult =
  | { status: "matched" | "added"; collegeName: string }
  | { status: "unassigned" }

/** Assign a coach's college from what they typed and their email. Never throws. */
export async function assignCoachCollege(
  admin: SupabaseClient,
  input: { userId: string; institution: string | null | undefined; email: string | null | undefined },
): Promise<CoachCollegeResult> {
  try {
    const institution = String(input.institution ?? "").trim()
    const { data: colleges } = await admin.from("colleges").select("id, name, division, logo_url")

    let college: CollegeRow | null = suggestColleges((colleges ?? []) as CollegeRow[], {
      institution,
      email: input.email,
    })[0] ?? null
    let status: "matched" | "added" = "matched"

    if (!college) {
      if (!institution || !isEduEmail(input.email)) return { status: "unassigned" }
      /*
       * Before adding, look at the schools other college coaches already sit under. Some colleges
       * exist only there - "Glenville State", "Concord", "Allen University" were assigned by hand
       * and never added to `colleges` - and adding "Glenville State University" beside them would
       * split one school into two. A match there is added under its existing name, so the two
       * lists bridge back to the same school row.
       */
      const { data: coachRows } = await admin
        .from("user_profiles")
        .select("school_id")
        .in("role", ["college_coach", "college-coach"])
        .not("school_id", "is", null)
      const schoolIds = [...new Set((coachRows ?? []).map((r) => String((r as { school_id: string }).school_id)))]
      const { data: coachSchools } = schoolIds.length
        ? await admin.from("schools").select("id, name").in("id", schoolIds)
        : { data: [] as Array<{ id: string; name: string }> }
      const knownSchool = suggestColleges((coachSchools ?? []) as CollegeRow[], { institution, email: input.email })[0]
      const newName = knownSchool?.name ?? institution

      const { data: created, error } = await admin
        .from("colleges")
        .insert({ name: newName, division: "", updated_at: new Date().toISOString() })
        .select("id, name, division, logo_url")
        .single()
      if (error || !created) {
        // Most likely a race with another signup adding the same name: use that one.
        const { data: existing } = await admin
          .from("colleges")
          .select("id, name, division, logo_url")
          .ilike("name", newName)
          .limit(1)
          .maybeSingle()
        if (!existing) {
          console.error("[coach-college] could not add college:", error?.message)
          return { status: "unassigned" }
        }
        college = existing as CollegeRow
      } else {
        college = created as CollegeRow
        status = "added"
      }
    }

    const school = await schoolForCollege(admin, college)
    const { error: updateError } = await admin
      .from("user_profiles")
      .update({ school_id: school.id })
      .eq("user_id", input.userId)
    if (updateError) {
      console.error("[coach-college] could not assign:", updateError.message)
      return { status: "unassigned" }
    }
    return { status, collegeName: college.name }
  } catch (e) {
    console.error("[coach-college]", e instanceof Error ? e.message : e)
    return { status: "unassigned" }
  }
}

/** The line staff read in the signup text. */
export function collegeResultNote(result: CoachCollegeResult): string {
  if (result.status === "matched") return `assigned to ${result.collegeName}`
  if (result.status === "added") return `new college added: ${result.collegeName}`
  return "no college assigned - set it on the dashboard"
}
