/** URL segment for /fundraising/athletes/[slug] — stable from NCU code. */

const NCU_FUNDRAISING_CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

export function fundraisingSlugFromCode(code: string): string {
  return code.trim().toLowerCase()
}

export function fundraisingCodeFromSlug(slug: string): string {
  return slug.trim().toUpperCase()
}

/** Public donor page for this NCU code, or null if not an athlete credit (e.g. general fund). */
export function fundraisingAthletePublicHrefFromCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toUpperCase()
  if (!NCU_FUNDRAISING_CODE_RE.test(c)) return null
  return `/fundraising/athletes/${fundraisingSlugFromCode(c)}`
}
