/**
 * A wrestler's short profile link: /w/xavier-bernthal-2029 (Matt, 27 October 2026).
 *
 * The profile's own address is /view-profile?id=<uuid>, which in an Instagram bio reads as
 * "app.ncwrestlingunited.com/view-profile…" and says nothing about whose it is. Families were
 * already putting it there (Jim Bernthal), so the share button now hands them this instead.
 *
 * Name and class year, computed - nothing stored. Two wrestlers with the same name in the same
 * class: the profile created first keeps the plain link and the later one adds the start of its
 * id ("-f5a8"). A newer namesake can never take an older wrestler's link, so a link given out
 * keeps working. Changing a wrestler's name or class does change the link; the old one then
 * finds nobody.
 */

export type ShortLinkAthlete = {
  id: string
  firstName?: string | null
  lastName?: string | null
  graduationyear?: number | null
  created_at?: string | null
}

/** "Xavier", "Bernthal" -> "xavier-bernthal"; accents, apostrophes and punctuation dropped. */
export function nameSlug(first: string | null | undefined, last: string | null | undefined): string {
  return `${first ?? ""} ${last ?? ""}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’?�]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** The order that decides who keeps the plain link: oldest profile first, then id. */
function seniority(a: ShortLinkAthlete, b: ShortLinkAthlete): number {
  return String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")) || a.id.localeCompare(b.id)
}

const SUFFIX = 4

/**
 * The slug for `athlete`, given everyone in the same class (it may include `athlete` itself).
 * Null when the profile has no name to build one from.
 */
export function shortSlugFor(athlete: ShortLinkAthlete, classmates: readonly ShortLinkAthlete[]): string | null {
  const name = nameSlug(athlete.firstName, athlete.lastName)
  if (!name) return null
  const base = athlete.graduationyear ? `${name}-${athlete.graduationyear}` : name
  const namesakes = [...classmates.filter((a) => a.id !== athlete.id && nameSlug(a.firstName, a.lastName) === name), athlete].sort(seniority)
  return namesakes[0]!.id === athlete.id ? base : `${base}-${athlete.id.replace(/-/g, "").slice(0, SUFFIX)}`
}

export type ParsedShortSlug = { name: string; year: number | null; suffix: string | null }

/** "xavier-bernthal-2029", "john-smith-2028-f5a8", "john-smith" (no class on file). */
export function parseShortSlug(slug: string): ParsedShortSlug | null {
  const s = decodeURIComponent(slug).toLowerCase().trim()
  const m = s.match(/^([a-z0-9]+(?:-[a-z0-9]+)*?)(?:-((?:19|20)\d{2}))?(?:-([0-9a-f]{4}))?$/)
  if (!m || !m[1]) return null
  return { name: m[1], year: m[2] ? Number(m[2]) : null, suffix: m[3] ?? null }
}

/** The wrestler a slug names, out of everyone in that class. */
export function resolveShortSlug<T extends ShortLinkAthlete>(parsed: ParsedShortSlug, classmates: readonly T[]): T | null {
  const namesakes = classmates.filter((a) => nameSlug(a.firstName, a.lastName) === parsed.name).sort(seniority)
  const hit = !parsed.suffix ? namesakes[0] : namesakes.find((a) => a.id.replace(/-/g, "").startsWith(parsed.suffix!))
  if (hit) return hit
  // With no class in the link, a surname that is four hex letters ("Abba") reads as a suffix.
  return parsed.suffix && parsed.year == null ? resolveShortSlug({ name: `${parsed.name}-${parsed.suffix}`, year: null, suffix: null }, classmates) : null
}
