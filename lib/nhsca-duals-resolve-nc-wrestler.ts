import { NHSCA_DUALS_NATIONAL_195_STARTERS, NHSCA_DUALS_SELECT_160_STARTERS } from "@/lib/nhsca-duals-live-results/rosters"
import type { NhscaDualsDualRow, NhscaDualsMatchRow, NhscaDualsWrestlerRow } from "@/lib/nhsca-duals-live-results/types"

/** Resolve NC wrestler for a bout (records + cards). Weight slot wins over stale/wrong nc_wrestler_id. */
export function resolveNcWrestlerIdForMatch(
  match: NhscaDualsMatchRow,
  dual: NhscaDualsDualRow | undefined,
  wrestlers: NhscaDualsWrestlerRow[]
): string | null {
  if (!dual?.team_id || !match.winner) return null

  const atWeight = wrestlers.filter(
    (w) => w.team_id === dual.team_id && w.display_weight === match.weight && w.active
  )

  if (match.weight === "160" && atWeight.length > 1) {
    const starter = NHSCA_DUALS_SELECT_160_STARTERS[dual.opponent_team_name]
    if (starter) {
      const named = atWeight.find((w) => w.name === starter)
      if (named) return named.id
    }
  }

  if (match.weight === "195" && atWeight.length > 1) {
    const starter = NHSCA_DUALS_NATIONAL_195_STARTERS[dual.opponent_team_name]
    if (starter) {
      const named = atWeight.find((w) => w.name === starter)
      if (named) return named.id
    }
  }

  if (atWeight.length === 1) return atWeight[0]!.id

  if (match.nc_wrestler_id) {
    const linked = wrestlers.find((w) => w.id === match.nc_wrestler_id)
    if (linked?.active && linked.team_id === dual.team_id && linked.display_weight === match.weight) {
      return match.nc_wrestler_id
    }
  }

  return null
}

export function findWrestlerForMatch(
  match: NhscaDualsMatchRow,
  dual: NhscaDualsDualRow | undefined,
  wrestlers: NhscaDualsWrestlerRow[]
): NhscaDualsWrestlerRow | undefined {
  const id = resolveNcWrestlerIdForMatch(match, dual, wrestlers)
  return id ? wrestlers.find((w) => w.id === id) : undefined
}
