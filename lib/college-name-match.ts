/** Shared college name normalization + fuzzy match (leaderboard grouping + athlete expand). */

export function normalizeCollegeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(university|college|state|tech|of|the|at)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function collegeNameVariants(name: string): string[] {
  const lower = name.toLowerCase().trim()
  const variants = new Set<string>([lower, normalizeCollegeNameKey(name)])
  variants.add(lower.replace(/\bnc\b/g, "north carolina"))
  variants.add(lower.replace(/\bnorth carolina\b/g, "nc"))
  variants.add(lower.replace(/\bunc\b/g, "university of north carolina"))
  variants.add(lower.replace(/\buniversity of north carolina\b/g, "unc"))
  variants.add(lower.replace(/\bnc state\b/g, "north carolina state"))
  variants.add(lower.replace(/\bnorth carolina state\b/g, "nc state"))
  return [...variants].filter(Boolean)
}

/** True when two college strings refer to the same program (handles UNC/NC State abbreviations). */
export function collegesMatchName(a: string, b: string): boolean {
  const aTrim = a.trim()
  const bTrim = b.trim()
  if (!aTrim || !bTrim) return false

  const aLower = aTrim.toLowerCase()
  const bLower = bTrim.toLowerCase()
  if (aLower === bLower) return true

  const aNorm = normalizeCollegeNameKey(aTrim)
  const bNorm = normalizeCollegeNameKey(bTrim)
  if (aNorm && bNorm && aNorm === bNorm) return true
  if (aLower.includes(bLower) || bLower.includes(aLower)) return true
  if (aNorm && bNorm && (aNorm.includes(bNorm) || bNorm.includes(aNorm))) return true

  for (const av of collegeNameVariants(aTrim)) {
    for (const bv of collegeNameVariants(bTrim)) {
      if (av === bv || av.includes(bv) || bv.includes(av)) return true
    }
  }

  return false
}

/** Find an existing leaderboard bucket key for this college name, if any. */
export function findCollegeGroupKey(collegeName: string, existingKeys: Iterable<string>): string | null {
  for (const key of existingKeys) {
    if (collegesMatchName(collegeName, key)) return key
  }
  return null
}

/** True if athlete.college belongs to any name in the group (all spellings in a bucket). */
export function athleteCollegeInGroup(athleteCollege: string, groupNames: string[]): boolean {
  const trimmed = athleteCollege.trim()
  if (!trimmed) return false
  return groupNames.some((name) => collegesMatchName(trimmed, name))
}
