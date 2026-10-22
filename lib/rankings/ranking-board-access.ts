import { createClient } from "@/lib/supabase/server"

/**
 * Scoped access to the admin ranking boards, for people who rank without being full admins.
 *
 * Brandon Palmer ranks the girls (Matt, 8 October 2026): he edits the women's Class of 2027 and
 * 2028 boards and may read every men's board, and nothing else in admin. Like the TOC field flag,
 * the grant lives in Supabase Auth `app_metadata`, which only the service role can write, so
 * nobody can widen their own access:
 *
 *   app_metadata.ranking_board_access = [
 *     { "gender": "Female", "years": [2027, 2028], "access": "edit" },
 *     { "gender": "Male", "years": "all", "access": "read" }
 *   ]
 *
 * A grant covers North Carolina's boards unless it names `states`. Alan Faponte ranks South
 * Carolina (Matt, 21 October 2026), so his grants say `"states": ["SC"]` and NC stays closed to him:
 *
 *   { "gender": "Male", "years": "all", "access": "edit", "states": ["SC"] }
 *
 * Full admins can edit every board. Publishing, star overrides and everything else in admin
 * stay with full admins.
 */
export type RankingBoardAccess = "edit" | "read"

export type RankingBoardGrant = {
  gender: "Male" | "Female"
  years: number[] | "all"
  access: RankingBoardAccess
  /** Two-letter state codes. Absent means North Carolina, which is what every grant meant before. */
  states?: string[]
}

const GRANT_DEFAULT_STATES = ["NC"]

function grantStates(grant: RankingBoardGrant): string[] {
  return (grant.states?.length ? grant.states : GRANT_DEFAULT_STATES).map((s) => s.trim().toUpperCase())
}

function isGrant(value: unknown): value is RankingBoardGrant {
  if (!value || typeof value !== "object") return false
  const g = value as Record<string, unknown>
  return (
    (g.gender === "Male" || g.gender === "Female") &&
    (g.access === "edit" || g.access === "read") &&
    (g.years === "all" || (Array.isArray(g.years) && g.years.every((y) => Number.isInteger(y)))) &&
    (g.states === undefined || (Array.isArray(g.states) && g.states.every((s) => typeof s === "string")))
  )
}

/** The access a set of grants gives to one board (North Carolina's unless `state` says); edit wins over read. */
export function rankingBoardAccessFor(
  grants: unknown,
  gender: string,
  year: number,
  state = "NC",
): RankingBoardAccess | null {
  const wanted = String(state).trim().toUpperCase()
  const list = Array.isArray(grants) ? grants.filter(isGrant) : []
  let best: RankingBoardAccess | null = null
  for (const grant of list) {
    if (grant.gender.toLowerCase() !== String(gender).trim().toLowerCase()) continue
    if (grant.years !== "all" && !grant.years.includes(year)) continue
    if (!grantStates(grant).includes(wanted)) continue
    if (grant.access === "edit") return "edit"
    best = "read"
  }
  return best
}

/** Whether a user holds any ranking-board grant at all - enough to open the board page. With `state`, only grants for that state count. */
export function hasAnyRankingBoardGrant(grants: unknown, state?: string): boolean {
  if (!Array.isArray(grants)) return false
  const wanted = state?.trim().toUpperCase()
  return grants.some((g) => isGrant(g) && (!wanted || grantStates(g).includes(wanted)))
}

export type RankingBoardAuth =
  | { ok: true; access: RankingBoardAccess; isAdmin: boolean; userId: string }
  | { ok: false; status: 401 | 403; error: string }

/** The signed-in user's access to one board, refused below `need`. */
export async function requireRankingBoardAccess(
  gender: string,
  year: number,
  need: RankingBoardAccess,
  state = "NC",
): Promise<RankingBoardAuth> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { ok: false, status: 401, error: "Unauthorized" }

  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).maybeSingle()
  if (profile?.is_admin === true) return { ok: true, access: "edit", isAdmin: true, userId: user.id }

  const access = rankingBoardAccessFor(user.app_metadata?.ranking_board_access, gender, year, state)
  if (!access || (need === "edit" && access !== "edit")) {
    return {
      ok: false,
      status: 403,
      error: access ? `You can view the ${state} ${gender} Class of ${year} board but not change it.` : `No access to the ${state} ${gender} Class of ${year} board.`,
    }
  }
  return { ok: true, access, isAdmin: false, userId: user.id }
}
