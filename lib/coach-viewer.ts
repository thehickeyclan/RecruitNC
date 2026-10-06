import type { SupabaseClient } from "@supabase/supabase-js"
import { classifyViewer } from "@/lib/viewer-role"

/**
 * Who is asking a coach route for a wrestler, decided once.
 *
 * The coach portal's athlete routes checked only that somebody was signed in, so any free
 * account - a fan, a parent of a rival - got the full row: cell, email, GPA, test scores. They
 * also honoured `viewAsCoachId` for anyone, which let one account read another coach's
 * recruiting notes. This is the rule they now share:
 *
 * - The route answers coaches and admins; everybody else is refused.
 * - Private fields (contact, academics) go only to a verified coach or an admin - the same line
 *   the public profile draws (lib/athlete-private-fields.ts).
 * - Only an admin may look through another coach's eyes.
 */
export type CoachViewer = {
  allowed: boolean
  isAdmin: boolean
  /** May receive cell, email, GPA and test scores. */
  maySeePrivate: boolean
}

export async function loadCoachViewer(admin: SupabaseClient, userId: string): Promise<CoachViewer> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", userId)
    .maybeSingle()
  const viewer = classifyViewer(profile ?? null)
  const isAdmin = viewer.kind === "admin" || (profile as { is_admin?: boolean } | null)?.is_admin === true
  return {
    allowed: isAdmin || viewer.isCoach,
    isAdmin,
    maySeePrivate: isAdmin || viewer.verifiedCoach,
  }
}
