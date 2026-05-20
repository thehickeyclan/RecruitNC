import type {
  NhscaDualsMatchRow,
  NhscaDualsResultsSnapshot,
  NhscaDualsTeamType,
} from "@/lib/nhsca-duals-live-results/types"
import { resultTypeLabel, toDisplayWeight } from "@/lib/nhsca-duals-live-results/scoring"

export type NhscaDualsWrestlerBoutRow = {
  roundName: string
  opponentTeam: string
  dayName: string
  weight: string
  outcome: "win" | "loss" | "draw" | "no_match"
  resultLabel: string
  teamPoints: number
  opponentWrestler: string
  note: string | null
}

export type NhscaDualsWrestlerCardStats = {
  wrestlerId: string | null
  name: string
  displayWeight: string
  wins: number
  losses: number
  teamPointsContributed: number
  bouts: NhscaDualsWrestlerBoutRow[]
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Match card label to roster row (e.g. "Dom Blue" ↔ "Dominic Blue"). */
export function namesMatchRoster(cardName: string, rosterName: string): boolean {
  const a = normalizeName(cardName)
  const b = normalizeName(rosterName)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true

  const aParts = a.split(" ").filter(Boolean)
  const bParts = b.split(" ").filter(Boolean)
  if (aParts.length < 2 || bParts.length < 2) return false

  const aLast = aParts[aParts.length - 1]
  const bLast = bParts[bParts.length - 1]
  const aFirst = aParts[0]
  const bFirst = bParts[0]
  return aLast === bLast && (aFirst === bFirst || aFirst[0] === bFirst[0] || bFirst.startsWith(aFirst))
}

export function findWrestlerForCard(
  snapshot: NhscaDualsResultsSnapshot,
  teamType: NhscaDualsTeamType,
  cardName: string,
  weightClass: string
): { id: string; name: string; display_weight: string } | null {
  const team = snapshot.teams.find((t) => t.team_type === teamType)
  if (!team) return null
  const dw = toDisplayWeight(weightClass)
  const candidates = snapshot.wrestlers.filter((w) => w.team_id === team.id && w.display_weight === dw && w.active)
  const byName = candidates.find((w) => namesMatchRoster(cardName, w.name))
  if (byName) return byName
  if (candidates.length === 1) return candidates[0]
  return null
}

function boutOutcome(m: NhscaDualsMatchRow): NhscaDualsWrestlerBoutRow["outcome"] {
  if (m.winner === "nc") return "win"
  if (m.winner === "opponent") return "loss"
  if (m.winner === "draw") return "draw"
  return "no_match"
}

export function buildWrestlerCardStats(
  snapshot: NhscaDualsResultsSnapshot,
  teamType: NhscaDualsTeamType,
  cardName: string,
  weightClass: string
): NhscaDualsWrestlerCardStats {
  const wrestler = findWrestlerForCard(snapshot, teamType, cardName, weightClass)
  const displayWeight = toDisplayWeight(weightClass)
  const empty: NhscaDualsWrestlerCardStats = {
    wrestlerId: wrestler?.id ?? null,
    name: cardName,
    displayWeight,
    wins: 0,
    losses: 0,
    teamPointsContributed: 0,
    bouts: [],
  }
  if (!wrestler) return empty

  const team = snapshot.teams.find((t) => t.team_type === teamType)
  if (!team) return empty

  const teamDualIds = new Set(snapshot.duals.filter((d) => d.team_id === team.id).map((d) => d.id))
  const bouts: NhscaDualsWrestlerBoutRow[] = []

  for (const m of snapshot.matches) {
    if (!teamDualIds.has(m.dual_id)) continue
    if (m.nc_wrestler_id !== wrestler.id) continue
    if (!m.winner || !m.result_type) continue

    const dual = snapshot.duals.find((d) => d.id === m.dual_id)
    if (!dual) continue
    const day = snapshot.days.find((d) => d.id === dual.day_id)

    bouts.push({
      roundName: dual.round_name,
      opponentTeam: dual.opponent_team_name,
      dayName: day?.name ?? "Day 1",
      weight: m.weight,
      outcome: boutOutcome(m),
      resultLabel: resultTypeLabel(m.result_type),
      teamPoints: m.nc_points ?? 0,
      opponentWrestler: m.opponent_wrestler_name?.trim() || "—",
      note: m.notes?.trim() || null,
    })
  }

  bouts.sort((a, b) => {
    const dayCmp = a.dayName.localeCompare(b.dayName)
    if (dayCmp !== 0) return dayCmp
    return a.roundName.localeCompare(b.roundName)
  })

  let wins = 0
  let losses = 0
  let teamPointsContributed = 0
  for (const b of bouts) {
    teamPointsContributed += b.teamPoints
    if (b.outcome === "win") wins++
    else if (b.outcome === "loss") losses++
  }

  return {
    wrestlerId: wrestler.id,
    name: wrestler.name,
    displayWeight,
    wins,
    losses,
    teamPointsContributed,
    bouts,
  }
}

export function buildTeamWrestlerStatsIndex(
  snapshot: NhscaDualsResultsSnapshot,
  teamType: NhscaDualsTeamType,
  cards: { wrestler: string; weightClass: string }[]
): Record<string, NhscaDualsWrestlerCardStats> {
  const index: Record<string, NhscaDualsWrestlerCardStats> = {}
  for (const card of cards) {
    const key = `${card.weightClass}::${card.wrestler}`
    index[key] = buildWrestlerCardStats(snapshot, teamType, card.wrestler, card.weightClass)
  }
  return index
}

export function cardStatsKey(weightClass: string, wrestler: string) {
  return `${weightClass}::${wrestler}`
}
