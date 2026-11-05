/**
 * The coach an admin or business account is viewing as, kept for the visit (lib/view-as/subject.ts).
 * Shared by the browser, which sets and clears it, and the server, which reads it. Not a
 * credential: the server ignores it unless the signed-in account may view as a coach.
 */
export const VIEW_AS_COOKIE = "view_as_coach"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A user id, or null for anything else. */
export function cleanViewAsId(v: string | null | undefined): string | null {
  const s = String(v ?? "").trim()
  return UUID.test(s) ? s : null
}

/** Browser only: remember the coach for this visit, or forget it. */
export function setViewAsCookie(id: string | null): void {
  const clean = cleanViewAsId(id)
  document.cookie = clean
    ? `${VIEW_AS_COOKIE}=${clean}; path=/; max-age=43200; samesite=lax`
    : `${VIEW_AS_COOKIE}=; path=/; max-age=0; samesite=lax`
}

/**
 * The family whose Command Center an admin or business account is looking at (Matt, 4 Nov 2026:
 * "same view for gemma amiott command center"). Set only by /view-as-family/<id>, which checks the
 * account first; the server checks again on every read (lib/recruiting/portal-viewer.ts).
 */
export const VIEW_AS_FAMILY_COOKIE = "view_as_family"
