import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { interestedInProgram } from "@/lib/college-programs/college-interest"
import { nearestCollegeWeights } from "@/lib/college-programs/roster-depth"
import { NEED_LABEL, roomByWeight, roomFor, weightsPublished } from "@/lib/college-programs/roster-room"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { isApprovedCoach } from "@/lib/coach-messages"
import { mapSchoolIdFor } from "@/lib/college-programs/load"
import { coachProgramOf, viewGenderFor } from "@/lib/recruiting/coach-program"

/**
 * The wrestlers interested in a program, for its coaches (Coach Home's panel and the Interested
 * page): each with the coach's Perfect Recruit verdict and the room at his weight in the fall he
 * would arrive (Matt, 21 Oct 2026).
 */
export type InterestedCard = Awaited<ReturnType<typeof loadInterested>>[number]

/** The interested wrestlers for one program, each with its two fit signals. */
export async function loadInterested(
  admin: SupabaseClient,
  schoolId: string,
  gender: "Male" | "Female" | null,
  onBoard: Set<string>,
  fitViewer: Awaited<ReturnType<typeof resolveFitViewer>> | null,
) {
  const rows = await interestedInProgram(admin, schoolId, gender)
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const [last, flags] = await Promise.all([
    loadLastCompeted(admin, ids, new Map(rows.map((r) => [r.id, r.classYear]))).catch(() => new Map()),
    fitViewer?.allowed && fitViewer.hasStandard ? loadFitFlags(admin, ids, fitViewer.saved!.criteria, { personal: fitViewer.personal }).catch(() => null) : Promise.resolve(null),
  ])
  const roomOf = (g: string | null) => (g === "Female" ? "womens" : "mens") as "mens" | "womens"
  return rows.map((r) => {
    const weight = Number(String(last.get(r.id)?.weight ?? "").replace(/[^0-9]/g, "")) || null
    const team = roomOf(r.gender ?? gender)
    const room = roomFor(schoolId, team)
    const at = weight && room && weightsPublished(room) && r.classYear ? nearestCollegeWeights(weight, team)[0] : null
    const row = at ? roomByWeight(room!, team, r.classYear!).find((x) => x.weight === at) : null
    const flag = flags?.get(r.id)
    return {
      ...r,
      weight: weight ? String(weight) : null,
      onBoard: onBoard.has(r.id),
      fit: flag ? { verdict: flag.verdict, summary: flag.summary } : null,
      room: row ? { weight: row.weight, need: row.need, label: NEED_LABEL[row.need], staying: row.staying, fall: r.classYear! } : null,
    }
  })
}

/**
 * Whose interest a signed-in coach may see: their program on the college map, and which team's
 * wrestlers (a "both" program sees both). Approved coaches and admins only.
 */
export async function coachInterestScope(
  admin: SupabaseClient,
  userId: string,
): Promise<{ allowed: false } | { allowed: true; schoolId: string | null; program: string | null; gender: "Male" | "Female" | null; seenAt: string | null }> {
  const [{ data: profile }, account] = await Promise.all([
    admin.from("user_profiles").select("role, verified_coach, verification_status, is_admin, school_id").eq("user_id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId).then((r) => r.data?.user ?? null, () => null),
  ])
  if (!profile || !(profile.is_admin === true || isApprovedCoach(profile as never))) return { allowed: false }
  const { data: school } = profile.school_id ? await admin.from("schools").select("name").eq("id", profile.school_id).maybeSingle() : { data: null }
  const program = coachProgramOf(account)
  return {
    allowed: true,
    schoolId: school?.name ? mapSchoolIdFor(String(school.name)) : null,
    program: (school?.name as string | null) ?? null,
    gender: program === "both" ? null : viewGenderFor(program),
    seenAt: typeof account?.user_metadata?.interest_seen_at === "string" ? account.user_metadata.interest_seen_at : null,
  }
}

/** New since the coach last opened the Interested page: the menu's count. */
export async function newInterestCount(admin: SupabaseClient, schoolId: string, gender: "Male" | "Female" | null, seenAt: string | null): Promise<number> {
  const rows = await interestedInProgram(admin, schoolId, gender)
  return rows.filter((r) => !seenAt || r.at > seenAt).length
}

/** Opening the page clears the count. */
export async function markInterestSeen(admin: SupabaseClient, userId: string): Promise<void> {
  const { data } = await admin.auth.admin.getUserById(userId)
  await admin.auth.admin.updateUserById(userId, { user_metadata: { ...(data?.user?.user_metadata ?? {}), interest_seen_at: new Date().toISOString() } })
}
