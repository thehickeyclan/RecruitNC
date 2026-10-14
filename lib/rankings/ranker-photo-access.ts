import type { SupabaseClient } from "@supabase/supabase-js"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"
import { rankingBoardAccessFor } from "@/lib/rankings/ranking-board-access"

/**
 * May a ranker set the photo of a wrestler on the board he ranks?
 *
 * Brandon Palmer ranks the girls and is not an admin; most of the ranked girls had no photo, and he
 * is the person who has them (Matt, 14 October 2026: "give Brandon Palmer the ability to upload pics
 * for the girls who are on our rankings"). So: an edit grant for the athlete's board
 * (lib/rankings/ranking-board-access.ts), and the athlete ranked on it, within the class's depth.
 * The profile photo only - nothing else on the profile opens to him.
 */
export async function rankerMayUploadPhoto(
  admin: SupabaseClient,
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
  athleteId: string,
): Promise<boolean> {
  const grants = user?.app_metadata?.ranking_board_access
  if (!Array.isArray(grants) || grants.length === 0) return false
  const { data: athlete } = await admin
    .from("athletes")
    .select("gender, graduationyear, prospect_ranking")
    .eq("id", athleteId)
    .maybeSingle()
  return rankerMayUploadPhotoFor(grants, athlete)
}

export function rankerMayUploadPhotoFor(
  grants: unknown,
  athlete: { gender?: unknown; graduationyear?: unknown; prospect_ranking?: unknown } | null | undefined,
): boolean {
  if (!athlete) return false
  const year = Number(athlete.graduationyear)
  const rank = Number(athlete.prospect_ranking)
  const gender = String(athlete.gender ?? "").trim().toLowerCase().startsWith("f") ? "Female" : "Male"
  if (!Number.isFinite(year) || !Number.isFinite(rank) || rank < 1) return false
  if (rank > getPublicRankingsMax(year, gender)) return false
  return rankingBoardAccessFor(grants, gender, year) === "edit"
}
