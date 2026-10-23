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
 * And scoped rankers (Matt, 22 Oct 2026: "give role based rights to state ambassadors"). Alan Faponte
 * ranks South Carolina, Dilberth Jimenez Maryland; the grant lives in Supabase Auth app_metadata,
 * which only the service role can write, and rides in the signed session token. A ranker passes the
 * gate for the whole site, as a signed-in visitor will after launch (23 Oct: rankers open profiles
 * from the board). That exposes nothing new: profiles are public on app.ncwrestlingunited.com,
 * admin pages still require an admin, the admin APIs refuse them at the server
 * (lib/admin-api-gate.ts), and the board and save APIs check which boards a grant covers.
 */
import { accessTokenFrom, isAdminUser, verifiedClaims } from "@/lib/admin-api-gate"
import { isInternalAccount } from "@/lib/internal-accounts"

export async function stagingGateAllows(
  headers: Headers,
  cookies: Array<{ name: string; value: string }>,
  // Kept for callers; the gate no longer varies by path.
  _pathname = "",
): Promise<boolean> {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return false // fail closed
  const token = accessTokenFrom(headers, cookies)
  if (!token) return false
  const claims = await verifiedClaims(token, secret)
  if (!claims) return false
  if (isInternalAccount(claims.email)) return true
  if (Array.isArray(claims.appMetadata.ranking_board_access) && claims.appMetadata.ranking_board_access.length > 0) return true
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
