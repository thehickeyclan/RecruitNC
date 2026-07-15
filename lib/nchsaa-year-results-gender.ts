/**
 * Men/women filtering for NCHSAA year results (`wrestling_nchsaa_results`).
 * 2026+: boys use 1A/2A + 3A–8A; girls use 1-4A + 5A–8A. Shared 5A–8A rows split by weight when `gender` is absent.
 */

export type NchsaaGenderFilter = "men" | "women"

export const MENS_WEIGHT_CLASSES = [
  "106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285",
] as const

export const WOMENS_WEIGHT_CLASSES = [
  "100", "107", "114", "120", "126", "132", "138", "145", "152", "165", "185", "235",
] as const

const MENS_ONLY_WEIGHTS = new Set(["106", "113", "144", "150", "157", "175", "190", "215", "285"])
const WOMENS_ONLY_WEIGHTS = new Set(["100", "107", "114", "145", "152", "185", "235"])
const SHARED_5A_8A = new Set(["5A", "6A", "7A", "8A"])

export function normalizeNchsaaWeightClass(weight: string | null | undefined): string {
  return String(weight ?? "")
    .replace(/\s*lbs?\s*$/i, "")
    .trim()
}

function explicitGender(gender: string | null | undefined): NchsaaGenderFilter | null {
  const g = String(gender ?? "")
    .trim()
    .toLowerCase()
  if (!g) return null
  if (g === "male" || g === "m" || g === "boy" || g === "boys" || g === "men") return "men"
  if (g === "female" || g === "f" || g === "girl" || g === "girls" || g === "women" || g === "woman") {
    return "women"
  }
  return null
}

export function matchesNchsaaGenderFilter(
  row: { classification: string; weight_class: string; gender?: string | null },
  filter: NchsaaGenderFilter,
  year: number,
): boolean {
  const fromColumn = explicitGender(row.gender)
  if (fromColumn) return fromColumn === filter

  const cls = row.classification.trim()
  const clsLower = cls.toLowerCase()
  const weight = normalizeNchsaaWeightClass(row.weight_class)

  if (year >= 2026) {
    if (filter === "men") {
      if (cls === "1-4A") return false
      if (cls === "1A/2A" || cls === "3A" || cls === "4A" || cls === "1A" || cls === "2A") return true
      if (SHARED_5A_8A.has(cls)) {
        if (WOMENS_ONLY_WEIGHTS.has(weight)) return false
        return true
      }
      return false
    }

    if (cls === "1-4A") return true
    if (cls === "1A/2A" || cls === "3A" || cls === "4A" || cls === "1A" || cls === "2A") return false
    if (SHARED_5A_8A.has(cls)) {
      if (MENS_ONLY_WEIGHTS.has(weight)) return false
      return true
    }
    return clsLower.includes("girl")
  }

  if (filter === "women") {
    return (
      clsLower.includes("girl") ||
      clsLower.includes("women") ||
      cls === "1-4A"
    )
  }
  return (
    !clsLower.includes("girl") &&
    !clsLower.includes("women") &&
    cls !== "1-4A"
  )
}

export function matchesNchsaaDivisionFilter(division: string, filter: NchsaaGenderFilter, year: number): boolean {
  const cls = division.trim()
  const clsLower = cls.toLowerCase()

  if (year >= 2026) {
    if (filter === "men") {
      return cls === "1A/2A" || cls === "3A" || cls === "4A" || cls === "1A" || cls === "2A" || SHARED_5A_8A.has(cls)
    }
    return cls === "1-4A" || SHARED_5A_8A.has(cls) || clsLower.includes("girl")
  }

  if (filter === "women") return clsLower.includes("girl") || cls === "1-4A"
  return !clsLower.includes("girl") && cls !== "1-4A"
}

export function weightClassesForGender(filter: NchsaaGenderFilter): readonly string[] {
  return filter === "women" ? WOMENS_WEIGHT_CLASSES : MENS_WEIGHT_CLASSES
}
