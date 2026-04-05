/**
 * National team interest / duals: NHSCA uses NCHSAA-style classes; AAU Scholastic Duals uses its own set.
 */

/** High school / NHSCA National Duals style */
export const NHSCA_INTEREST_WEIGHT_CLASSES = [
  "106",
  "113",
  "120",
  "126",
  "132",
  "138",
  "145",
  "152",
  "160",
  "170",
  "182",
  "195",
  "220",
  "285",
] as const

/** AAU Scholastic Duals – All-Star Boys */
export const AAU_SCHOLASTIC_WEIGHT_CLASSES = [
  "106",
  "113",
  "120",
  "126",
  "132",
  "138",
  "144",
  "150",
  "157",
  "165",
  "175",
  "190",
  "215",
  "285",
] as const

export type NhscaWeightClass = (typeof NHSCA_INTEREST_WEIGHT_CLASSES)[number]
export type AauWeightClass = (typeof AAU_SCHOLASTIC_WEIGHT_CLASSES)[number]

export function sortNationalTeamWeightClassesAsc(weights: string[]): string[] {
  return [...weights].sort((a, b) => {
    const na = parseInt(a, 10)
    const nb = parseInt(b, 10)
    const da = Number.isFinite(na) ? na : 999
    const db = Number.isFinite(nb) ? nb : 999
    return da - db
  })
}

/** Every distinct class needed on the interest form (weights are chosen before tournament checkboxes). */
export function interestFormWeightClassUnion(): string[] {
  const set = new Set<string>([...NHSCA_INTEREST_WEIGHT_CLASSES, ...AAU_SCHOLASTIC_WEIGHT_CLASSES])
  return sortNationalTeamWeightClassesAsc([...set])
}

/** Admin edit / filters: allowed classes for a row based on which tournaments they selected. */
export function weightOptionsForSubmissionInterest(tournamentIds: string[]): string[] {
  const set = new Set<string>()
  if (tournamentIds.includes("nhsca") || tournamentIds.includes("deep-south")) {
    NHSCA_INTEREST_WEIGHT_CLASSES.forEach((w) => set.add(w))
  }
  if (tournamentIds.includes("aau")) {
    AAU_SCHOLASTIC_WEIGHT_CLASSES.forEach((w) => set.add(w))
  }
  if (set.size === 0) return interestFormWeightClassUnion()
  return sortNationalTeamWeightClassesAsc([...set])
}

/** Label for dropdowns / tables. AAU uses HWT for 285; NHSCA typically shows 285 lbs. */
export function formatNationalTeamWeightLabel(weight: string, variant: "nhsca" | "aau" | "neutral"): string {
  if (weight === "285") {
    if (variant === "nhsca") return "285 lbs"
    return "HWT (285)"
  }
  return `${weight} lbs`
}

export function isAauScholasticWeightClass(weightStr: string): boolean {
  const w = (weightStr ?? "").trim()
  return (AAU_SCHOLASTIC_WEIGHT_CLASSES as readonly string[]).includes(w)
}

/**
 * Map any numeric weight string to the closest AAU scholastic class (ties → lighter class).
 * Returns the input unchanged if it is already an AAU class or non-numeric.
 */
export function nearestAauScholasticWeightClass(weightStr: string): string {
  const trimmed = (weightStr ?? "").trim()
  if (!trimmed) return trimmed
  if (isAauScholasticWeightClass(trimmed)) return trimmed
  const w = parseInt(trimmed, 10)
  if (!Number.isFinite(w)) return trimmed
  let best: string = AAU_SCHOLASTIC_WEIGHT_CLASSES[0]
  let bestDist = Infinity
  for (const c of AAU_SCHOLASTIC_WEIGHT_CLASSES) {
    const n = parseInt(c, 10)
    const d = Math.abs(w - n)
    const bestN = parseInt(best, 10)
    if (d < bestDist || (d === bestDist && n < bestN)) {
      bestDist = d
      best = c
    }
  }
  return best
}
