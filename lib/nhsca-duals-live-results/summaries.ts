import type {
  NhscaDualsDualRow,
  NhscaDualsMatchRow,
  NhscaDualsTeamSummary,
  NhscaDualsWrestlerRecord,
  NhscaDualsWrestlerRow,
} from "./types"
import { resolveNcWrestlerIdForMatch } from "@/lib/nhsca-duals-resolve-nc-wrestler"
import { matchCountsTowardWrestlerRecord, wrestlerNetPoints } from "./scoring"

export function buildTeamSummary(
  teamId: string,
  duals: NhscaDualsDualRow[],
  matches: NhscaDualsMatchRow[],
  wrestlers: NhscaDualsWrestlerRow[]
): NhscaDualsTeamSummary {
  const finalDuals = duals.filter((d) => d.team_id === teamId && d.status === "final")
  const allTeamDualIds = new Set(duals.filter((d) => d.team_id === teamId).map((d) => d.id))
  const teamMatches = matches.filter((m) => allTeamDualIds.has(m.dual_id))

  let dualWins = 0
  let dualLosses = 0
  for (const d of finalDuals) {
    if (d.nc_score > d.opponent_score) dualWins++
    else if (d.opponent_score > d.nc_score) dualLosses++
  }

  let matchWins = 0
  let matchLosses = 0
  let pointsFor = 0
  let pointsAgainst = 0

  const byWrestler = new Map<string, NhscaDualsWrestlerRecord>()

  for (const w of wrestlers.filter((x) => x.team_id === teamId)) {
    byWrestler.set(w.id, {
      wrestlerId: w.id,
      name: w.name,
      displayWeight: w.display_weight,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    })
  }

  for (const m of teamMatches) {
    pointsFor += m.nc_points
    pointsAgainst += m.opponent_points
    const countsRecord = matchCountsTowardWrestlerRecord(m.result_type)
    if (countsRecord) {
      if (m.winner === "nc") matchWins++
      else if (m.winner === "opponent") matchLosses++
    }

    const dual = duals.find((d) => d.id === m.dual_id)
    const wid = resolveNcWrestlerIdForMatch(m, dual, wrestlers)
    if (wid && byWrestler.has(wid)) {
      const rec = byWrestler.get(wid)!
      rec.pointsFor += m.nc_points
      rec.pointsAgainst += m.opponent_points
      if (countsRecord) {
        if (m.winner === "nc") rec.wins++
        else if (m.winner === "opponent") rec.losses++
      }
    }
  }

  const records = [...byWrestler.values()]
  const undefeated = records.filter((r) => r.wins > 0 && r.losses === 0)
  const topScorers = records
    .filter((r) => r.wins + r.losses > 0)
    .sort((a, b) => wrestlerNetPoints(b.pointsFor, b.pointsAgainst) - wrestlerNetPoints(a.pointsFor, a.pointsAgainst))
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      displayWeight: r.displayWeight,
      netPoints: wrestlerNetPoints(r.pointsFor, r.pointsAgainst),
    }))

  return {
    dualWins,
    dualLosses,
    matchWins,
    matchLosses,
    pointsFor,
    pointsAgainst,
    undefeated,
    topScorers,
  }
}
