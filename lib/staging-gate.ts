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
 */
import { accessTokenFrom, isAdminUser, verifiedClaims } from "@/lib/admin-api-gate"
import { isInternalAccount } from "@/lib/internal-accounts"

export async function stagingGateAllows(headers: Headers, cookies: Array<{ name: string; value: string }>): Promise<boolean> {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return false // fail closed
  const token = accessTokenFrom(headers, cookies)
  if (!token) return false
  const claims = await verifiedClaims(token, secret)
  if (!claims) return false
  if (isInternalAccount(claims.email)) return true
  return isAdminUser(claims.sub)
}
