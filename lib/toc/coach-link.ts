import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Signed per-athlete links for the corner coach form.
 *
 * The form used to hold the announced roster and let anyone search it. That exposed no more than
 * the weight-class release already had, but it let a stranger designate coaches for somebody
 * else's child, and left no way to tell a parent from a passer-by when two submissions disagreed.
 *
 * A signed link carries the wrestler, so the page needs no roster at all — and holding the link
 * is the evidence that we sent it to that family.
 *
 * Signatures are derived rather than stored: nothing to migrate, and rotating the secret revokes
 * every outstanding link at once.
 */

function secret(): string {
  const configured = process.env.TOC_COACH_LINK_SECRET?.trim()
  if (configured) return configured
  // Falls back to a server-only secret that already exists, so this works without new
  // configuration. HMAC never reveals its key, and rotating either one invalidates old links.
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!fallback) throw new Error("No secret available to sign coach links.")
  return fallback
}

export function signAthleteToken(athleteId: string): string {
  return createHmac("sha256", secret()).update(`toc-coach:${athleteId}`).digest("base64url").slice(0, 32)
}

/** Constant-time so a wrong signature cannot be narrowed down one character at a time. */
export function verifyAthleteToken(athleteId: string, token: string): boolean {
  if (!athleteId || !token) return false
  const expected = signAthleteToken(athleteId)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function coachLinkFor(baseUrl: string, athleteId: string): string {
  const url = new URL("/tournament-of-champions/corner-coaches", baseUrl)
  url.searchParams.set("a", athleteId)
  url.searchParams.set("t", signAthleteToken(athleteId))
  return url.toString()
}
