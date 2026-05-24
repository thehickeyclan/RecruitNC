import { NHSCA_DUALS_SELECT_160_STARTERS } from "@/lib/nhsca-duals-live-results/rosters"
import type { NhscaDualsDualRow, NhscaDualsMatchRow, NhscaDualsWrestlerRow } from "@/lib/nhsca-duals-live-results/types"

/** Resolve NC wrestler for a bout (records + cards). Falls back when bulk import omitted nc_wrestler_id. */
export function resolveNcWrestlerIdForMatch(
  match: NhscaDualsMatchRow,
  dual: NhscaDualsDualRow | undefined,
  wrestlers: NhscaDualsWrestlerRow[]
): string | null {
  if (match.nc_wrestler_id) return match.nc_wrestler_id
  if (!dual?.team_id || !match.winner) return null

  const atWeight = wrestlers.filter(
    (w) => w.team_id === dual.team_id && w.display_weight === match.weight && w.active
  )
  if (atWeight.length === 1) return atWeight[0]!.id

  if (match.weight === "160") {
    const starter = NHSCA_DUALS_SELECT_160_STARTERS[dual.opponent_team_name]
    if (starter) {
      const named = atWeight.find((w) => w.name === starter)
      if (named) return named.id
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
