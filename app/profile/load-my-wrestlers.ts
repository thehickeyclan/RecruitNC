import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"
import type { MyWrestler, ProfileAudience } from "./my-wrestlers"

/** The wrestlers this account owns or is a linked parent of. Never allowed to fail the page. */
export async function loadMyWrestlers(userId: string): Promise<MyWrestler[]> {
  try {
    const admin = createAdminClient()
    const [{ data: owned }, { data: links }] = await Promise.all([
      admin.from("athletes").select("id").eq("claimed_by_user_id", userId),
      admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId),
    ])
    const self = new Set((owned ?? []).map((r) => String(r.id)))
    const ids = [...new Set([...self, ...(links ?? []).map((r) => String(r.athlete_id))])]
    if (!ids.length) return []
    const { data: rows } = await admin.from("athletes").select("id, name, graduationyear, highschool, photourl").in("id", ids)
    return (rows ?? [])
      .map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        classYear: r.graduationyear == null ? null : Number(r.graduationyear),
        school: (r.highschool as string | null) ?? null,
        photo: (r.photourl as string | null) ?? null,
        relationship: self.has(String(r.id)) ? ("self" as const) : ("parent" as const),
      }))
      .sort((x, y) => (x.relationship === y.relationship ? x.name.localeCompare(y.name) : x.relationship === "self" ? -1 : 1))
  } catch (e) {
    console.error("[profile] my wrestlers:", e)
    return []
  }
}

/**
 * Who is opening /profile, for the top of the page. Everyone lands here - athletes, parents,
 * fans and college coaches alike - and an account with no wrestler needs a different first line
 * for each: a coach is never told to claim a profile.
 */
export async function loadProfileAudience(userId: string): Promise<ProfileAudience> {
  try {
    const { data } = await createAdminClient().from("user_profiles").select("role, verified_coach, profile_type").eq("user_id", userId).maybeSingle()
    const kind = classifyViewer(data ?? {}).kind
    return kind === "anonymous" ? "other" : kind
  } catch (e) {
    console.error("[profile] audience:", e)
    return "other"
  }
}
