import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsWrestlerRecord } from "@/lib/nhsca-duals-live-results/types"

export type NhscaDuals2026Mow = {
  id: string
  name: string
  weightClass: string
  team: "national" | "select"
}

export const NHSCA_DUALS_2026_MOW_PHOTO = "/national-team/nhsca-duals-2026/mow-tobin-danny.png"

export const NHSCA_DUALS_2026_MOWS: NhscaDuals2026Mow[] = [
  { id: "tobin-mcnair", name: "Tobin McNair", weightClass: "160", team: "national" },
  { id: "danny-mcdermott", name: "Danny McDermott", weightClass: "120", team: "select" },
]

export function mowsForScope(scope: CommandCenterScope): NhscaDuals2026Mow[] {
  if (scope === "all") return NHSCA_DUALS_2026_MOWS
  return NHSCA_DUALS_2026_MOWS.filter((m) => m.team === scope)
}

export function weightLabel(weightClass: string): string {
  const u = weightClass.trim().toUpperCase()
  return u === "HWT" ? "HWT" : `${weightClass} lbs`
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+jr\.?$/i, "").replace(/\s+/g, " ").trim()
}

export function dualRecordForMow(
  mow: NhscaDuals2026Mow,
  records: NhscaDualsWrestlerRecord[]
): string | null {
  const target = normalizeName(mow.name)
  const match = records.find((r) => normalizeName(r.name) === target)
  if (!match || match.wins + match.losses === 0) return null
  return `${match.wins}–${match.losses}`
}

export function mowPhotoCaption(scope: CommandCenterScope): string {
  const mows = mowsForScope(scope)
  if (mows.length === 2) {
    return "Tobin McNair (National, 160 lbs) and Danny McDermott (Select, 120 lbs) — NC United’s Most Outstanding Wrestlers at NHSCA Duals 2026"
  }
  if (mows.length === 1) {
    const m = mows[0]
    const team = m.team === "national" ? "National" : "Select"
    return `${m.name} (${weightLabel(m.weightClass)}) — NC United ${team} team Most Outstanding Wrestler`
  }
  return ""
}
