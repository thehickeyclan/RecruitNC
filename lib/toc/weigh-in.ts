/**
 * Friday weigh-in check-in: who has weighed in, who made weight, who is still missing.
 *
 * One weigh-in, 4:00–5:00 PM Friday, flat — no allowance. Two scale stations split the field by
 * weight so each line stays short. Kept free of I/O so the rules can be tested without a scale.
 */

import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export type SkinCheck = "pass" | "fail"

export type WeighInRecord = {
  athleteId: string
  weightClass: number
  recordedWeight: number | null
  skinCheck: SkinCheck | null
  lanyardGiven: boolean
  notes: string | null
  recordedByName: string | null
  updatedAt: string | null
}

export type RosterAthlete = {
  athleteId: string
  name: string
  club: string | null
  weightClass: number
  seed: number | null
  /** Numbers to call if a wrestler is missing — the athlete's, then a linked parent's. */
  phones?: { label: string; display: string; e164: string }[]
  /** Approved corner coaches. `e164` is null when no usable cell is on file. */
  coaches?: { name: string; display: string | null; e164: string | null }[]
}

export type WeighInState = "not-weighed" | "incomplete" | "cleared" | "over-weight" | "skin-fail"

/** Station 1 takes the lighter half of the field, station 2 the heavier half. */
export const WEIGH_IN_STATIONS: { id: 1 | 2; label: string; weights: readonly number[] }[] = [
  { id: 1, label: "Station 1 · 117–157", weights: TOC_WEIGHT_CLASSES.filter((w) => w <= 157) },
  { id: 2, label: "Station 2 · 165–285", weights: TOC_WEIGHT_CLASSES.filter((w) => w >= 165) },
]

/** Flat weight: the scale must read at or under the class. No allowance. */
export function madeWeight(recordedWeight: number | null, weightClass: number): boolean | null {
  if (recordedWeight == null || !Number.isFinite(recordedWeight)) return null
  return recordedWeight <= weightClass
}

/**
 * Where a wrestler stands. Cleared means on weight and skin check passed — the two things that
 * decide whether they wrestle. The lanyard is tracked alongside but does not hold anyone up.
 */
export function weighInState(record: WeighInRecord | undefined): WeighInState {
  if (!record || (record.recordedWeight == null && record.skinCheck == null)) return "not-weighed"
  if (madeWeight(record.recordedWeight, record.weightClass) === false) return "over-weight"
  if (record.skinCheck === "fail") return "skin-fail"
  if (isClearedEntry(record.recordedWeight, record.weightClass, record.skinCheck === "pass")) return "cleared"
  return "incomplete"
}

/**
 * Skin check passed and not recorded over — used for a saved record and for what is typed before Save.
 *
 * A typed weight is not required. The table weighs the wrestler on the scale in front of an
 * official and records the skin check and lanyard; on the day, nobody typed the number. Requiring
 * it held all nineteen wrestlers weighed in the first half hour at "In progress" and the counter at
 * 0 of 80. A weight that is typed still has to be on — over the class is flagged, never cleared.
 */
export function isClearedEntry(recordedWeight: number | null, weightClass: number, skinPassed: boolean): boolean {
  return madeWeight(recordedWeight, weightClass) !== false && skinPassed
}

export type WeighInSummary = {
  total: number
  cleared: number
  notWeighed: number
  incomplete: number
  problems: number
  missingByWeight: Record<number, RosterAthlete[]>
}

export function summarizeWeighIns(
  roster: readonly RosterAthlete[],
  records: ReadonlyMap<string, WeighInRecord>,
): WeighInSummary {
  const summary: WeighInSummary = { total: roster.length, cleared: 0, notWeighed: 0, incomplete: 0, problems: 0, missingByWeight: {} }
  for (const athlete of roster) {
    const state = weighInState(records.get(athlete.athleteId))
    if (state === "cleared") summary.cleared++
    else if (state === "not-weighed") {
      summary.notWeighed++
      ;(summary.missingByWeight[athlete.weightClass] ??= []).push(athlete)
    } else if (state === "incomplete") summary.incomplete++
    else summary.problems++
  }
  return summary
}

/** Parses what a scale person types: "133", "132.8", " 133.4 lbs". Null when it is not a weight. */
export function parseScaleReading(raw: string): number | null {
  const match = raw.trim().match(/^(\d{2,3}(?:\.\d{1,2})?)\s*(?:lbs?|pounds)?$/i)
  if (!match) return null
  const value = Number(match[1])
  return value >= 60 && value <= 400 ? value : null
}
