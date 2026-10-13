/**
 * A college coach's home is Coach Home, decided before a page is drawn.
 *
 * The front page is NC United's, written for people without an account. A signed-in coach was
 * sent on to Coach Home by the browser, after the page had rendered and two more requests had
 * come back - so a returning coach looked at the wrong product first, and one who glanced and
 * left saw nothing else (Rob Koll, 13 October 2026). The recruiting portal is being separated
 * from the community site; its users do not see the community front page at all (Matt).
 *
 * This only decides a redirect, never access: Coach Home checks the session itself. So it may
 * trust a hint cookie, and a token whose signature is good but whose hour has run out - the
 * returning coach is exactly the one with an expired token. No Supabase Auth call
 * (AUTH_CONFIG_LOCKED.md); one cached profile read, and only when there is no hint yet.
 *
 * Runs in the edge runtime, so Web Crypto and fetch only.
 */
import { accessTokenFrom, verifiedUserId } from "@/lib/admin-api-gate"
import { COACH_HOME_PATH, PORTAL_HINT_COOKIE, PORTAL_PARTNER_COOKIE } from "@/lib/portal-hint"

export { COACH_HOME_PATH, PORTAL_HINT_COOKIE }

type Cookie = { name: string; value: string }

const hasSession = (cookies: Cookie[]) => cookies.some((c) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(c.name) && c.value)

const COLLEGE_COACH_ROLES = new Set(["college_coach"])
const roleCache = new Map<string, { coach: boolean; at: number }>()
const CACHE_MS = 60_000

async function isCollegeCoach(userId: string): Promise<boolean> {
  const hit = roleCache.get(userId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.coach
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false
  const res = await fetch(`${url}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=role,profile_type,is_admin`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  })
  if (!res.ok) return false
  const rows = (await res.json()) as Array<{ role?: string | null; profile_type?: string | null; is_admin?: boolean | null }>
  const row = rows[0]
  // The same reading as classifyViewer: the role, or the profile type only when there is no role.
  const role = String(row?.role || row?.profile_type || "").trim().toLowerCase().replace(/-/g, "_")
  const coach = Boolean(row) && row!.is_admin !== true && role !== "admin" && COLLEGE_COACH_ROLES.has(role)
  roleCache.set(userId, { coach, at: Date.now() })
  return coach
}

/**
 * Whether a request for the front page should go to Coach Home instead, and whether the hint
 * cookie still needs setting so the next visit decides without a lookup.
 */
export async function coachFrontDoor(
  headers: Headers,
  cookies: Cookie[],
  /** The request asked for the NC United site by name (?community=1). */
  askedForCommunity = false,
): Promise<{ redirect: boolean; setHint: boolean }> {
  if (!hasSession(cookies)) return { redirect: false, setHint: false }
  // A partner program's coach who chose the NC United link is let through; nobody else is.
  if (askedForCommunity && cookies.find((c) => c.name === PORTAL_PARTNER_COOKIE)?.value === "1") {
    return { redirect: false, setHint: false }
  }

  const hint = cookies.find((c) => c.name === PORTAL_HINT_COOKIE)?.value
  if (hint === "1") return { redirect: true, setHint: false }
  if (hint === "0") return { redirect: false, setHint: false }

  const secret = process.env.SUPABASE_JWT_SECRET
  const token = accessTokenFrom(headers, cookies)
  if (!secret || !token) return { redirect: false, setHint: false }
  // nowSeconds 0: an expired token still says who this is, which is all a redirect needs.
  const userId = await verifiedUserId(token, secret, 0)
  if (!userId) return { redirect: false, setHint: false }
  try {
    const coach = await isCollegeCoach(userId)
    return { redirect: coach, setHint: coach }
  } catch {
    return { redirect: false, setHint: false }
  }
}
