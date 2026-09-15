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
 * Where a wrestler stands. Cleared means weighed, on weight, skin check passed and lanyard handed
 * over — the lanyard is the proof of weigh-in for the rest of the weekend.
 */
export function weighInState(record: WeighInRecord | undefined): WeighInState {
  if (!record || (record.recordedWeight == null && record.skinCheck == null)) return "not-weighed"
  if (madeWeight(record.recordedWeight, record.weightClass) === false) return "over-weight"
  if (record.skinCheck === "fail") return "skin-fail"
  if (record.recordedWeight != null && record.skinCheck === "pass" && record.lanyardGiven) return "cleared"
  return "incomplete"
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
