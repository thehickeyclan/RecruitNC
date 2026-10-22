/**
 * The gate in front of a recruiting brand that has not launched (Matt, 16 Oct 2026: "keep
 * recruit.wrestlingguild.com behind a server-enforced admin-only gate until I explicitly approve
 * public launch").
 *
 * Enforced in middleware, before any page or API runs, so no athlete data leaves the server for a
 * visitor who is not let in. Same session check as the admin API gate (lib/admin-api-gate.ts): the
 * token is verified locally, no Supabase Auth call, one cached profile read.
 *
 * Who is let in: admins, and our own internal test accounts (lib/internal-accounts.ts - the test
 * college coach and the App Store review login) so family and coach flows can be tested as a
 * non-admin. No real user is in either group.
 *
 * And scoped rankers, for the ranking board only (Matt, 22 Oct 2026: "all admin from
 * recruitwrestlers and give role based rights to state ambassadors"). Alan Faponte ranks South
 * Carolina; his grant lives in Supabase Auth app_metadata, which only the service role can write,
 * and it rides in the signed session token. The gate only checks a grant exists: the board and save
 * APIs check which boards it covers (lib/rankings/ranking-board-access.ts).
 */
import { accessTokenFrom, isAdminUser, verifiedClaims } from "@/lib/admin-api-gate"
import { isInternalAccount } from "@/lib/internal-accounts"

/** The board page and the two APIs it needs. Every other admin tool stays admin-only. */
const RANKER_PATHS = new Set(["/admin/rankings/board", "/api/admin/rankings/board", "/api/admin/rankings/save"])

export function isRankerPath(pathname: string): boolean {
  return RANKER_PATHS.has(pathname.replace(/\/$/, ""))
}

export async function stagingGateAllows(
  headers: Headers,
  cookies: Array<{ name: string; value: string }>,
  pathname = "",
): Promise<boolean> {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return false // fail closed
  const token = accessTokenFrom(headers, cookies)
  if (!token) return false
  const claims = await verifiedClaims(token, secret)
  if (!claims) return false
  if (isInternalAccount(claims.email)) return true
  if (isRankerPath(pathname) && Array.isArray(claims.appMetadata.ranking_board_access) && claims.appMetadata.ranking_board_access.length > 0) return true
  return isAdminUser(claims.sub)
}

/**
 * A scoped ranker who is not an admin (Alan Faponte, SC). Their board lives on recruitwrestlers.com
 * (Matt, 22 Oct 2026: "move alan over to the rankings portal in admin recruitwrestlers"), so the
 * board on NC United's address forwards them there. Admins keep both addresses.
 */
export async function isRankerOnly(headers: Headers, cookies: Array<{ name: string; value: string }>): Promise<boolean> {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return false
  const token = accessTokenFrom(headers, cookies)
  if (!token) return false
  const claims = await verifiedClaims(token, secret)
  if (!claims) return false
  const grants = claims.appMetadata.ranking_board_access
  if (!Array.isArray(grants) || grants.length === 0) return false
  return !(await isAdminUser(claims.sub))
}
