import type { Tournament } from "@/lib/nc-united-api"
import {
  AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
  AAU_SCHOLASTIC_DUALS_2026_RESULTS_META,
  AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED,
  AAU_SCHOLASTIC_DUALS_2026_TEAM_SUMMARY,
} from "@/lib/aau-scholastic-duals-2026-results"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"

export type NationalTeamAggregateTotals = {
  tournamentCount: number
  totalTeamWins: number
  totalTeamLosses: number
  totalIndividualWins: number
  totalIndividualLosses: number
  uniqueAthletes: Set<string>
}

export type NationalTeamTournamentCardStats = {
  dualRecord: string
  individual: string
  winPct: number | null
  placement: string | null
  ready: boolean
}

export function normalizeNationalTeamAthleteName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

export function isNhscaDuals2026Tournament(t: Tournament): boolean {
  return t.year === 2026 && /nhsca/i.test(t.name) && /dual/i.test(t.name)
}

export function isAauScholasticDuals2026Tournament(t: Tournament): boolean {
  return t.year === 2026 && /aau/i.test(t.name) && /scholastic/i.test(t.name)
}

export function parseDualRecord(record: string | null | undefined): { wins: number; losses: number } | null {
  const match = record?.match(/(\d+)-(\d+)/)
  if (!match) return null
  return { wins: parseInt(match[1], 10), losses: parseInt(match[2], 10) }
}

export function parseWinLossRecord(record: string | null | undefined): { wins: number; losses: number } | null {
  return parseDualRecord(record)
}

export function tournamentCardStatsFromDb(t: Tournament): NationalTeamTournamentCardStats {
  const individualWins = t.individual_wins
  const individualLosses = t.individual_losses
  const individualTotal =
    individualWins != null && individualLosses != null ? individualWins + individualLosses : 0

  return {
    dualRecord: t.team_record ?? "—",
    individual:
      individualWins != null && individualLosses != null ? `${individualWins}-${individualLosses}` : "—",
    winPct:
      individualTotal > 0
        ? Math.round((individualWins! / individualTotal) * 100)
        : t.win_percentage != null
          ? Math.round(t.win_percentage)
          : null,
    placement: t.overall_placement,
    ready: Boolean(t.team_record),
  }
}

export function mergeNhsca2026NationalIntoAggregate(
  dualsData: (NhscaDualsResultsSnapshot & { tablesReady?: boolean }) | null,
  hasNhsca2026InDb: boolean,
  totals: NationalTeamAggregateTotals
): NationalTeamTournamentCardStats | null {
  if (hasNhsca2026InDb || !dualsData?.summaries?.national || !dualsData.tablesReady) return null

  const nationalTeam = dualsData.teams?.find((t) => t.team_type === "national")
  if (!nationalTeam) return null

  const n = dualsData.summaries.national
  totals.tournamentCount += 1
  totals.totalTeamWins += n.dualWins
  totals.totalTeamLosses += n.dualLosses
  totals.totalIndividualWins += n.matchWins
  totals.totalIndividualLosses += n.matchLosses

  for (const wrestler of dualsData.wrestlers ?? []) {
    if (wrestler.team_id !== nationalTeam.id) continue
    const normalized = normalizeNationalTeamAthleteName(wrestler.name)
    if (normalized) totals.uniqueAthletes.add(normalized)
  }

  const matchTotal = n.matchWins + n.matchLosses
  return {
    dualRecord: `${n.dualWins}-${n.dualLosses}`,
    individual: `${n.matchWins}-${n.matchLosses}`,
    winPct: matchTotal > 0 ? Math.round((n.matchWins / matchTotal) * 100) : null,
    placement: null,
    ready: true,
  }
}

export function mergeAauScholastic2026IntoAggregate(
  hasAau2026InDb: boolean,
  totals: NationalTeamAggregateTotals
): NationalTeamTournamentCardStats | null {
  if (hasAau2026InDb || !AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED) return null

  const summary = AAU_SCHOLASTIC_DUALS_2026_TEAM_SUMMARY
  const dual = parseDualRecord(summary.dualRecord)
  const individual = parseWinLossRecord(summary.individualRecord)
  if (!dual || !individual) return null

  totals.tournamentCount += 1
  totals.totalTeamWins += dual.wins
  totals.totalTeamLosses += dual.losses
  totals.totalIndividualWins += individual.wins
  totals.totalIndividualLosses += individual.losses

  for (const row of AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS) {
    const normalized = normalizeNationalTeamAthleteName(row.wrestler)
    if (normalized) totals.uniqueAthletes.add(normalized)
  }

  return {
    dualRecord: summary.dualRecord,
    individual: summary.individualRecord,
    winPct: Math.round(summary.individualWinPct),
    placement: AAU_SCHOLASTIC_DUALS_2026_RESULTS_META.placement,
    ready: true,
  }
}

export function resolveTournamentCardStats(
  tournament: Tournament | undefined,
  merged: NationalTeamTournamentCardStats | null
): NationalTeamTournamentCardStats | null {
  if (tournament) return tournamentCardStatsFromDb(tournament)
  return merged
}

export function computeNationalTeamAggregatePercentages(totals: NationalTeamAggregateTotals): {
  overallWinPercentage: number
  teamRecordWinPercentage: number
} {
  const totalTeamMatches = totals.totalTeamWins + totals.totalTeamLosses
  const teamRecordWinPercentage =
    totalTeamMatches > 0 ? Math.round((totals.totalTeamWins / totalTeamMatches) * 100) : 0

  const totalMatches = totals.totalIndividualWins + totals.totalIndividualLosses
  const overallWinPercentage =
    totalMatches > 0 ? Math.round((totals.totalIndividualWins / totalMatches) * 100) : 0

  return { overallWinPercentage, teamRecordWinPercentage }
}
