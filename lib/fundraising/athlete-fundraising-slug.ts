/** URL segment for /fundraising/athletes/[slug] — stable from NCU code. */

export function fundraisingSlugFromCode(code: string): string {
  return code.trim().toLowerCase()
}

export function fundraisingCodeFromSlug(slug: string): string {
  return slug.trim().toUpperCase()
}
