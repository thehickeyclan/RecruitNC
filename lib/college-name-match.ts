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

/** True when two college strings refer to the same program (exact / normalized / alias only — no substring). */
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

  for (const av of collegeNameVariants(aTrim)) {
    for (const bv of collegeNameVariants(bTrim)) {
      if (av === bv) return true
      const avNorm = normalizeCollegeNameKey(av)
      const bvNorm = normalizeCollegeNameKey(bv)
      if (avNorm && bvNorm && avNorm === bvNorm) return true
    }
  }

  return false
}

/** True if athlete.college belongs to any name in the group (all spellings in a bucket). */
export function athleteCollegeInGroup(athleteCollege: string, groupNames: string[]): boolean {
  const trimmed = athleteCollege.trim()
  if (!trimmed) return false
  return groupNames.some((name) => collegesMatchName(trimmed, name))
}
