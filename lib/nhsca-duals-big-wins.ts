import { parseNoteTags, splitMatchNotes } from "@/lib/nhsca-duals-match-notes"
import { resultTypeTrackShort, toDisplayWeight } from "@/lib/nhsca-duals-live-results/scoring"
import type { NhscaDualsResultsSnapshot, NhscaDualsTeamType } from "@/lib/nhsca-duals-live-results/types"
import { findWrestlerForMatch } from "@/lib/nhsca-duals-resolve-nc-wrestler"
import { NHSCA_DUALS_2026_BIG_WINS } from "@/lib/nhsca-duals-2026-big-wins"
import { namesMatchRoster } from "@/lib/nhsca-duals-wrestler-card-stats"

export type NhscaDualsBigWin = {
  id: string
  wrestlerName: string
  weight: string
  opponentName: string
  opponentTeam: string
  resultLabel: string
  scoreLine: string | null
  roundName: string
  dayName: string
  teamType: NhscaDualsTeamType
  /** Optional — e.g. "#8 seed" or "Ranked opponent" */
  highlight?: string
}

function teamTypeForDual(snapshot: NhscaDualsResultsSnapshot, teamId: string): NhscaDualsTeamType {
  return snapshot.teams.find((t) => t.id === teamId)?.team_type === "select" ? "select" : "national"
}

/** Bouts tagged "Big win" in admin notes, plus curated entries from lib/nhsca-duals-2026-big-wins.ts */
export function buildNhscaDualsBigWins(snapshot: NhscaDualsResultsSnapshot): NhscaDualsBigWin[] {
  const dayById = new Map(snapshot.days.map((d) => [d.id, d.name]))
  const fromDb: NhscaDualsBigWin[] = []

  for (const dual of snapshot.duals) {
    const teamType = teamTypeForDual(snapshot, dual.team_id)
    const dayName = dayById.get(dual.day_id) ?? "Day"
    const dualMatches = snapshot.matches.filter((m) => m.dual_id === dual.id)

    for (const m of dualMatches) {
      if (m.winner !== "nc" || !m.result_type) continue
      const tags = parseNoteTags(m.notes)
      if (!tags.includes("Big win")) continue

      const wrestler = findWrestlerForMatch(m, dual, snapshot.wrestlers)
      const { scoreLine } = splitMatchNotes(m.notes)

      fromDb.push({
        id: `db-${m.id}`,
        wrestlerName: wrestler?.name ?? "NC United",
        weight: m.weight,
        opponentName: m.opponent_wrestler_name?.trim() || "Opponent",
        opponentTeam: dual.opponent_team_name,
        resultLabel: resultTypeTrackShort(m.result_type),
        scoreLine,
        roundName: dual.round_name ?? "Dual",
        dayName,
        teamType,
      })
    }
  }

  const curated: NhscaDualsBigWin[] = NHSCA_DUALS_2026_BIG_WINS.map((w, i) => ({
    id: `curated-${i}-${w.wrestlerName}-${w.weight}`,
    ...w,
  }))

  const seen = new Set<string>()
  const merged: NhscaDualsBigWin[] = []

  for (const w of [...curated, ...fromDb]) {
    const key = `${w.wrestlerName.toLowerCase()}|${w.weight}|${w.opponentName.toLowerCase()}|${w.opponentTeam.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(w)
  }

  return merged.sort((a, b) => {
    const wt = parseInt(a.weight, 10) - parseInt(b.weight, 10)
    if (wt !== 0) return wt
    return a.wrestlerName.localeCompare(b.wrestlerName)
  })
}

/** Big wins for one athlete card (name + weight + team). */
export function bigWinsForWrestlerCard(
  all: NhscaDualsBigWin[],
  cardName: string,
  weightClass: string,
  teamType: NhscaDualsTeamType
): NhscaDualsBigWin[] {
  const dw = toDisplayWeight(weightClass)
  return all.filter(
    (w) =>
      w.teamType === teamType &&
      w.weight === dw &&
      namesMatchRoster(cardName, w.wrestlerName)
  )
}
