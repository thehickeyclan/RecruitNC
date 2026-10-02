import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Following a wrestler: who gets told when new results land.
 *
 * Kept separate from `college_coach_stars` on purpose. That table is a recruiting CRM — offers,
 * visits, financial aid, NLI dates, access scoped to the coach who owns the row. A follow is one
 * fact, it belongs to parents and high school coaches as much as to college staff, and pointing
 * push logic at a sixty-column pipeline table would tie notifications to recruiting permissions.
 *
 * Starring in the CRM creates a follow (see the migration), so coaches do not do it twice.
 */

/** Missing table: the migration has not run. Treated as "nobody follows anything" rather than an error. */
function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === "42P01" || /athlete_follows/.test(error.message ?? "")
}

export async function followAthlete(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
  source = "app",
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin
    .from("athlete_follows")
    .upsert({ user_id: userId, athlete_id: athleteId, source }, { onConflict: "user_id,athlete_id" })
  if (error) {
    if (missingTable(error)) return { ok: false, error: "Following is not switched on yet." }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function unfollowAthlete(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin
    .from("athlete_follows")
    .delete()
    .eq("user_id", userId)
    .eq("athlete_id", athleteId)
  if (error && !missingTable(error)) return { ok: false, error: error.message }
  return { ok: true }
}

export async function isFollowing(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("athlete_follows")
    .select("id")
    .eq("user_id", userId)
    .eq("athlete_id", athleteId)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

/** Athlete ids this account follows, newest first. */
export async function followedAthleteIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await admin
    .from("athlete_follows")
    .select("athlete_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) return []
  return (data ?? []).map((r) => String((r as { athlete_id: string }).athlete_id)).filter(Boolean)
}

/**
 * Accounts following each of these athletes, as athlete id → user ids.
 *
 * Takes the whole set at once because the digest asks about every athlete in an event's result
 * batch, and one query per wrestler would be a hundred round trips for a single notification.
 */
export async function followersOfAthletes(
  admin: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  const ids = [...new Set(athleteIds.filter(Boolean))]
  if (ids.length === 0) return out

  /* `in` lists have a practical ceiling; a result batch can exceed it. */
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await admin
      .from("athlete_follows")
      .select("athlete_id, user_id")
      .in("athlete_id", ids.slice(i, i + 200))
    if (error) {
      if (missingTable(error)) return out
      continue
    }
    for (const row of data ?? []) {
      const { athlete_id: athleteId, user_id: userId } = row as { athlete_id: string; user_id: string }
      if (!athleteId || !userId) continue
      const list = out.get(athleteId) ?? []
      list.push(userId)
      out.set(athleteId, list)
    }
  }
  return out
}

/** How many accounts follow this wrestler — the athlete-side view of the same table. */
export async function followerCount(admin: SupabaseClient, athleteId: string): Promise<number> {
  const { count, error } = await admin
    .from("athlete_follows")
    .select("id", { count: "exact", head: true })
    .eq("athlete_id", athleteId)
  if (error) return 0
  return count ?? 0
}
