import "server-only"

import { resolveEntityLogoUrlWithSource } from "@/lib/entity-logo-resolve"

/**
 * A map school's logo, or nothing.
 *
 * Only a row that names the school exactly (or the curated table) counts. The fuzzy tier is
 * refused on purpose: it is how Virginia's head coach was greeted with Ohio University's logo
 * (11 Oct 2026), and the map holds two Emmanuels, two Augustanas and a Cornell College beside a
 * Cornell University. A page with no logo is fine; a page with another school's is not.
 *
 * Tried in order: the name as listed, the name without its bracket, then the bracket itself
 * ("University of Maryland, College Park (Maryland)" -> "Maryland").
 */
const cache = new Map<string, { at: number; url: string | null }>()
const HOUR = 3_600_000

export async function schoolLogoUrl(school: { id: string; name: string }): Promise<string | null> {
  const hit = cache.get(school.id)
  if (hit && Date.now() - hit.at < HOUR) return hit.url

  const bracket = school.name.match(/\(([^)]+)\)/)?.[1]
  const names = [...new Set([school.name, school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(), ...(bracket ? bracket.split(/\s+or\s+/) : [])])]
  let url: string | null = null
  for (const name of names) {
    const found = await resolveEntityLogoUrlWithSource("college", name.trim()).catch(() => null)
    if (found && found.source !== "database-fuzzy") {
      url = found.url
      break
    }
  }
  cache.set(school.id, { at: Date.now(), url })
  return url
}
