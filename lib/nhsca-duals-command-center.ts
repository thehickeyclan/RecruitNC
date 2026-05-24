import { buildTeamSummary } from "@/lib/nhsca-duals-live-results/summaries"
import { NHSCA_DUALS_WEIGHTS, wrestlerNetPoints } from "@/lib/nhsca-duals-live-results/scoring"
import { resolveNcWrestlerIdForMatch } from "@/lib/nhsca-duals-resolve-nc-wrestler"
import type {
  NhscaDualsDualRow,
  NhscaDualsResultsSnapshot,
  NhscaDualsTeamSummary,
  NhscaDualsWrestlerRecord,
} from "@/lib/nhsca-duals-live-results/types"

export type CommandCenterScope = "all" | "national" | "select"
export type CommandCenterDayFilter = "all" | string

export type DualFeedItem = {
  dual: NhscaDualsDualRow
  teamType: "national" | "select"
  teamName: string
  dayName: string
  poolNumber: number | null
  weightsEntered: number
  weightsTotal: number
}

function combineSummaries(a: NhscaDualsTeamSummary, b: NhscaDualsTeamSummary): NhscaDualsTeamSummary {
  const topScorers = [...a.topScorers, ...b.topScorers]
    .sort((x, y) => y.netPoints - x.netPoints)
    .slice(0, 8)
  const undefeated = [...a.undefeated, ...b.undefeated].sort(
    (x, y) => wrestlerNetPoints(y.pointsFor, y.pointsAgainst) - wrestlerNetPoints(x.pointsFor, x.pointsAgainst)
  )
  return {
    dualWins: a.dualWins + b.dualWins,
    dualLosses: a.dualLosses + b.dualLosses,
    matchWins: a.matchWins + b.matchWins,
    matchLosses: a.matchLosses + b.matchLosses,
    pointsFor: a.pointsFor + b.pointsFor,
    pointsAgainst: a.pointsAgainst + b.pointsAgainst,
    undefeated,
    topScorers,
  }
}

function dualFeedSortScore(d: NhscaDualsDualRow): number {
  if (d.status === "in_progress") return 0
  if (d.status === "not_started") return 1
  return 2
}

function dualMatchesDay(dual: NhscaDualsDualRow, dayFilter: CommandCenterDayFilter): boolean {
  return dayFilter === "all" || dual.day_id === dayFilter
}

function summaryForTeam(
  snapshot: NhscaDualsResultsSnapshot,
  teamType: "national" | "select",
  dayFilter: CommandCenterDayFilter
): NhscaDualsTeamSummary {
  if (dayFilter === "all") return snapshot.summaries[teamType]
  const team = snapshot.teams.find((t) => t.team_type === teamType)
  if (!team) {
    return {
      dualWins: 0,
      dualLosses: 0,
      matchWins: 0,
      matchLosses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      undefeated: [],
      topScorers: [],
    }
  }
  const duals = snapshot.duals.filter((d) => d.team_id === team.id && dualMatchesDay(d, dayFilter))
  const dualIds = new Set(duals.map((d) => d.id))
  const matches = snapshot.matches.filter((m) => dualIds.has(m.dual_id))
  return buildTeamSummary(team.id, duals, matches, snapshot.wrestlers)
}

export function buildDualFeed(
  snapshot: NhscaDualsResultsSnapshot,
  scope: CommandCenterScope,
  dayFilter: CommandCenterDayFilter = "all"
): DualFeedItem[] {
  const types: ("national" | "select")[] =
    scope === "all" ? ["national", "select"] : [scope === "select" ? "select" : "national"]

  const items: DualFeedItem[] = []

  for (const teamType of types) {
    const team = snapshot.teams.find((t) => t.team_type === teamType)
    if (!team) continue
    const duals = snapshot.duals
      .filter((d) => d.team_id === team.id && d.published && dualMatchesDay(d, dayFilter))
      .sort((a, b) => a.sort_order - b.sort_order)

    for (const dual of duals) {
      const day = snapshot.days.find((d) => d.id === dual.day_id)
      const pool = snapshot.pools.find((p) => p.id === dual.pool_id)
      const dualMatches = snapshot.matches.filter((m) => m.dual_id === dual.id)
      const weightsEntered = NHSCA_DUALS_WEIGHTS.filter((w) => {
        const m = dualMatches.find((x) => x.weight === w)
        return !!(m?.winner && m?.result_type)
      }).length

      items.push({
        dual,
        teamType,
        teamName: team.name,
        dayName: day?.name ?? "Day 1",
        poolNumber: pool?.pool_number ?? null,
        weightsEntered,
        weightsTotal: NHSCA_DUALS_WEIGHTS.length,
      })
    }
  }

  return items.sort((a, b) => {
    const sa = dualFeedSortScore(a.dual)
    const sb = dualFeedSortScore(b.dual)
    if (sa !== sb) return sa - sb
    if (a.teamType !== b.teamType) return a.teamType === "national" ? -1 : 1
    return a.dual.sort_order - b.dual.sort_order
  })
}

export function getWrestlerRecords(
  snapshot: NhscaDualsResultsSnapshot,
  teamType: "national" | "select",
  dayFilter: CommandCenterDayFilter = "all"
): NhscaDualsWrestlerRecord[] {
  const team = snapshot.teams.find((t) => t.team_type === teamType)
  if (!team) return []
  const teamDualIds = new Set(
    snapshot.duals.filter((d) => d.team_id === team.id && dualMatchesDay(d, dayFilter)).map((d) => d.id)
  )
  const teamMatches = snapshot.matches.filter((m) => teamDualIds.has(m.dual_id))

  const byWrestler = new Map<string, NhscaDualsWrestlerRecord>()
  for (const w of snapshot.wrestlers.filter((x) => x.team_id === team.id && x.active)) {
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
    const dual = snapshot.duals.find((d) => d.id === m.dual_id)
    const wid = resolveNcWrestlerIdForMatch(m, dual, snapshot.wrestlers)
    if (!wid || !byWrestler.has(wid)) continue
    const rec = byWrestler.get(wid)!
    rec.pointsFor += m.nc_points
    rec.pointsAgainst += m.opponent_points
    if (m.winner === "nc") rec.wins++
    else if (m.winner === "opponent") rec.losses++
  }

  return [...byWrestler.values()].sort((a, b) => {
    const netA = wrestlerNetPoints(a.pointsFor, a.pointsAgainst)
    const netB = wrestlerNetPoints(b.pointsFor, b.pointsAgainst)
    if (netB !== netA) return netB - netA
    if (b.wins !== a.wins) return b.wins - a.wins
    return parseInt(a.displayWeight, 10) - parseInt(b.displayWeight, 10)
  })
}

export function getSummaryForScope(
  snapshot: NhscaDualsResultsSnapshot,
  scope: CommandCenterScope,
  dayFilter: CommandCenterDayFilter = "all"
): NhscaDualsTeamSummary {
  if (scope === "national") return summaryForTeam(snapshot, "national", dayFilter)
  if (scope === "select") return summaryForTeam(snapshot, "select", dayFilter)
  return combineSummaries(
    summaryForTeam(snapshot, "national", dayFilter),
    summaryForTeam(snapshot, "select", dayFilter)
  )
}

export function getWrestlersForScope(
  snapshot: NhscaDualsResultsSnapshot,
  scope: CommandCenterScope,
  dayFilter: CommandCenterDayFilter = "all"
): NhscaDualsWrestlerRecord[] {
  if (scope === "national") return getWrestlerRecords(snapshot, "national", dayFilter)
  if (scope === "select") return getWrestlerRecords(snapshot, "select", dayFilter)
  return [...getWrestlerRecords(snapshot, "national", dayFilter), ...getWrestlerRecords(snapshot, "select", dayFilter)].sort(
    (a, b) =>
      wrestlerNetPoints(b.pointsFor, b.pointsAgainst) - wrestlerNetPoints(a.pointsFor, a.pointsAgainst)
  )
}

/** Re-export for tests — summaries already built on snapshot. */
export { buildTeamSummary }
