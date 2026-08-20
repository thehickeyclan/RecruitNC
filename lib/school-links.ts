/**
 * Public high school pages.
 *
 * The slug is derived from the school name rather than stored, and the page resolves it back
 * through the same fuzzy matcher Data Dawg uses (`resolveCanonicalSchool`). That keeps one
 * source of truth for what a school is called — there is no id column to drift out of sync,
 * and a name that resolves in chat resolves at the URL too.
 */

export const RECRUITNC_APP_URL = "https://app.ncwrestlingunited.com"

export const HIGH_SCHOOL_PATH = "/high-schools"

/** "Cardinal Gibbons" → "cardinal-gibbons" */
export function schoolSlug(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** "cardinal-gibbons" → "cardinal gibbons", ready for the school resolver. */
export function schoolSlugToPhrase(slug: string): string {
  return String(slug ?? "")
    .replace(/-+/g, " ")
    .trim()
}

/** App-relative page for a school, or null when the name is unusable as a slug. */
export function getSchoolPagePath(name: string): string | null {
  const slug = schoolSlug(name)
  if (!slug) return null
  return `${HIGH_SCHOOL_PATH}/${slug}`
}

/** Absolute page for a school — use in Data Dawg answers, which render outside the app too. */
export function getSchoolPageUrl(name: string): string | null {
  const path = getSchoolPagePath(name)
  return path ? `${RECRUITNC_APP_URL}${path}` : null
}
