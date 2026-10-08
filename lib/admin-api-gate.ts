/**
 * The one door in front of /api/admin/*.
 *
 * 61 of 301 admin routes checked nobody at all - /api/admin/athletes handed every athlete's
 * phone, email and GPA to a signed-out request, and /api/admin/impersonate set a "you are now
 * this coach" cookie for anyone who asked. Guards written route by route are how that happened,
 * so the rule lives here, once, in middleware, and a new admin route is protected on the day it
 * is written.
 *
 * It honours AUTH_CONFIG_LOCKED.md: no call to Supabase Auth. The session token is verified
 * locally (HS256 against SUPABASE_JWT_SECRET, with expiry), and the only network call is one
 * PostgREST read of user_profiles - made only for /api/admin requests, and cached briefly.
 *
 * Runs in the edge runtime, so Web Crypto and fetch only.
 */

/** Paths under /api/admin that ordinary pages use, read-only, or that carry their own guard. */
const OPEN_GET = new Set([
  "/api/admin/colleges", // college dropdown in the athlete form
  "/api/admin/high-schools-from-logos", // high-school dropdown
  "/api/admin/clubs-from-logos", // club picker
  "/api/admin/check-impersonation", // the site-wide banner asks this on every page
])
/**
 * TOC routes have their own staff guards (requireTocFieldViewer etc.), and TOC staff are not all
 * admins. The ranking board and its draft save check requireRankingBoardAccess themselves, for
 * scoped rankers who are not admins (lib/rankings/ranking-board-access.ts).
 */
const OWN_GUARD_PREFIXES = ["/api/admin/toc/"]
const OWN_GUARD_PATHS = new Set(["/api/admin/rankings/board", "/api/admin/rankings/save"])

/**
 * Maintenance routes that live outside /api/admin but are just as much admin tools: debug
 * readers (/api/debug/find-colt-campbell returned phones, emails, GPAs and a birthdate to anyone),
 * test endpoints and one-off data fixes, several of which change data on a GET.
 */
const ADMIN_ONLY_PREFIXES = ["/api/admin/", "/api/debug/", "/api/debug-", "/api/test-", "/api/fix-", "/api/run-script/"]

export function adminGateApplies(pathname: string, method: string): boolean {
  if (pathname !== "/api/admin" && !ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) return false
  if (OWN_GUARD_PREFIXES.some((p) => pathname.startsWith(p))) return false
  if (OWN_GUARD_PATHS.has(pathname.replace(/\/$/, ""))) return false
  if (method === "GET" && OPEN_GET.has(pathname.replace(/\/$/, ""))) return false
  return true
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** The access token from an Authorization header, or from Supabase's (possibly chunked) session cookie. */
export function accessTokenFrom(headers: Headers, cookies: Array<{ name: string; value: string }>): string | null {
  const bearer = headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (bearer && bearer.split(".").length === 3) return bearer

  const parts = cookies
    .filter((c) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => Number(a.name.split(".")[1] ?? -1) - Number(b.name.split(".")[1] ?? -1))
  if (!parts.length) return null
  let raw = parts.map((c) => c.value).join("")
  try {
    raw = decodeURIComponent(raw)
  } catch {
    // already plain
  }
  try {
    const json = raw.startsWith("base64-") ? new TextDecoder().decode(b64urlToBytes(raw.slice(7))) : raw
    const session = JSON.parse(json) as { access_token?: string } | [string]
    const token = Array.isArray(session) ? session[0] : session.access_token
    return typeof token === "string" ? token : null
  } catch {
    return null
  }
}

/** The user id in a valid, unexpired HS256 token signed with our project secret; otherwise null. */
export async function verifiedUserId(token: string, secret: string, nowSeconds = Date.now() / 1000): Promise<string | null> {
  const [h, p, s] = token.split(".")
  if (!h || !p || !s) return null
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))) as { alg?: string }
    if (header.alg !== "HS256") return null
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"])
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`))
    if (!ok) return null
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as { sub?: string; exp?: number; role?: string }
    if (typeof claims.exp !== "number" || claims.exp < nowSeconds) return null
    if (claims.role !== "authenticated" || typeof claims.sub !== "string") return null
    return claims.sub
  } catch {
    return null
  }
}

const adminCache = new Map<string, { admin: boolean; at: number }>()
const CACHE_MS = 60_000

async function isAdminUser(userId: string): Promise<boolean> {
  const hit = adminCache.get(userId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false
  const res = await fetch(`${url}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=is_admin,role`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  })
  if (!res.ok) return false
  const rows = (await res.json()) as Array<{ is_admin?: boolean | null; role?: string | null }>
  const admin = rows.some((r) => r.is_admin === true || String(r.role ?? "").toLowerCase() === "admin")
  adminCache.set(userId, { admin, at: Date.now() })
  return admin
}

/**
 * null when the request may continue; otherwise the status to refuse it with.
 * A cron or script presenting CRON_SECRET is let through to the route, which checks it itself.
 */
export async function adminGateRefusal(
  headers: Headers,
  cookies: Array<{ name: string; value: string }>,
): Promise<401 | 403 | null> {
  const cron = process.env.CRON_SECRET?.trim()
  if (cron && (headers.get("authorization") === `Bearer ${cron}` || headers.get("x-cron-secret") === cron)) return null

  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return 403 // fail closed: an unconfigured deploy must not open the admin API
  const token = accessTokenFrom(headers, cookies)
  if (!token) return 401
  const userId = await verifiedUserId(token, secret)
  if (!userId) return 401
  return (await isAdminUser(userId)) ? null : 403
}
