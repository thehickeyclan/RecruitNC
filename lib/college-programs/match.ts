/**
 * Which schools on the college map have coaches on RecruitNC.
 *
 * Coach accounts point at a `schools` row by name, and those names are whatever the coach typed:
 * "Shenandoah", "Shenandoah University", "WVU Tech". The map list uses formal names:
 * "Commonwealth University-Lock Haven (Lock Haven)". Matching is exact on a normalised key, never
 * a substring, so "UNC" can never claim UNC Pembroke. Names that no key reaches go in ALIASES.
 */

const FILLER = /\b(the|of|at|university|college|universitat)\b/g

export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(FILLER, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Every key a map school answers to: its full name, the part in brackets, the part before them. */
export function schoolKeys(name: string): string[] {
  const keys = new Set<string>([nameKey(name)])
  const bracket = name.match(/\(([^)]+)\)/)
  if (bracket) {
    keys.add(nameKey(bracket[1]))
    keys.add(nameKey(name.replace(/\([^)]*\)/g, "")))
  }
  return [...keys].filter(Boolean)
}

/**
 * Coach-typed name → map school id, for names no key reaches. Ambiguous names (two Augustanas,
 * two Emmanuels, Cornell College vs Cornell University) were settled by the coach's email domain.
 * Liberty is absent on purpose: it wrestles club (NCWA), not in any division on the map.
 */
export const ALIASES: Record<string, string> = {
  "Augustana College": "augustana-college-illinois", // augustana.edu
  "Cornell College": "cornell-college", // cornellcollege.edu
  Emmanuel: "emmanuel-university", // ec.edu, Franklin Springs GA
  gomules1: "muhlenberg-college", // muhlenberg.edu; the school row was named after a password-like handle
  Castleton: "vtsu-castleton",
  "Oswego State": "suny-oswego",
  "Rochester Institute of Technology (RIT)": "rochester-institute-of-technology",
  "UNC Chapel Hill": "university-of-north-carolina-at-chapel-hill-north-carolina",
  "UNC Pembroke": "university-of-north-carolina-at-pembroke",
  "UW-Stevens Point": "university-of-wisconsin-stevens-point",
  "WVU Tech": "west-virginia-university-institute-of-technology",
}

export function buildSchoolIndex(schools: Array<{ id: string; name: string }>): Map<string, string> {
  const index = new Map<string, string>()
  const clashes = new Set<string>()
  for (const school of schools) {
    for (const key of schoolKeys(school.name)) {
      if (index.has(key) && index.get(key) !== school.id) clashes.add(key)
      else index.set(key, school.id)
    }
  }
  // A key two schools share identifies neither of them.
  for (const key of clashes) index.delete(key)
  return index
}

/**
 * Aliases match the exact name, not its key: "Cornell College" reduces to "cornell", and keying
 * the alias would hand every Cornell University coach who types "Cornell" to the wrong school.
 */
const EXACT_ALIASES = new Map(Object.entries(ALIASES).map(([alias, id]) => [alias.trim().toLowerCase(), id]))

export function matchSchool(index: Map<string, string>, coachSchoolName: string): string | null {
  return EXACT_ALIASES.get(coachSchoolName.trim().toLowerCase()) ?? index.get(nameKey(coachSchoolName)) ?? null
}
