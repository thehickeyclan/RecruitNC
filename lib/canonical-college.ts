/**
 * Single source for college name normalization.
 * Variants (e.g. NCSU, Carolina, Mount Olive University) map to one canonical name
 * so athletes and college_division_mappings stay consistent. Populate the DB with
 * canonical names; use this when saving so lookups work.
 *
 * Canonical names here should match college_name in college_division_mappings.
 */

// Lowercase variant → canonical display name (as stored in DB)
const VARIANT_TO_CANONICAL: Record<string, string> = {
  // UNC
  "unc": "UNC Chapel Hill",
  "carolina": "UNC Chapel Hill",
  "north carolina": "UNC Chapel Hill",
  "university of north carolina": "UNC Chapel Hill",
  "unc chapel hill": "UNC Chapel Hill",
  "university of north carolina at chapel hill": "UNC Chapel Hill",

  // NC State
  "nc state": "NC State",
  "ncsu": "NC State",
  "north carolina state": "NC State",
  "nc state university": "NC State",

  // Appalachian State
  "app state": "Appalachian State",
  "appalachian": "Appalachian State",
  "appalachian state": "Appalachian State",
  "appalachian state university": "Appalachian State",

  // Mount Olive
  "mount olive": "Mount Olive",
  "university of mount olive": "Mount Olive",
  "mount olive university": "Mount Olive",

  // Other NC / common
  "uncp": "UNC Pembroke",
  "pembroke": "UNC Pembroke",
  "unc pembroke": "UNC Pembroke",
  "gardner webb": "Gardner-Webb",
  "gardner-webb": "Gardner-Webb",
  "wake tech": "Wake Tech",
  "waketech": "Wake Tech",

  // Roanoke, Lander, etc. (so they match table)
  "roanoke": "Roanoke College",
  "roanoke college": "Roanoke College",
  "lander": "Lander University",
  "lander university": "Lander University",
  "presbyterian": "Presbyterian College",
  "presbyterian college": "Presbyterian College",
  "mount union": "Mount Union",
  "university of mount union": "Mount Union",
  "belmont abbey": "Belmont Abbey College",
  "belmont abbey college": "Belmont Abbey College",
}

/**
 * Normalize a college name to the canonical form used in the DB.
 * Use when saving athlete.college or when upserting college_division_mappings.
 * If no variant matches, returns trimmed input (so we don't corrupt unknown colleges).
 */
export function normalizeCollegeToCanonical(raw: string | null | undefined): string {
  const s = (raw ?? "").trim()
  if (!s) return ""
  const key = s.toLowerCase()
  return VARIANT_TO_CANONICAL[key] ?? s
}

/**
 * Resolve a college name to the key used for table lookup (lowercase canonical).
 * Use when reading from college_division_mappings so "NCSU" finds "nc state" row.
 */
export function collegeToLookupKey(raw: string | null | undefined): string {
  const canonical = normalizeCollegeToCanonical(raw)
  return canonical.toLowerCase()
}
