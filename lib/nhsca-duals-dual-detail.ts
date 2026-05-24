import { displayNoteTags, splitMatchNotes } from "@/lib/nhsca-duals-match-notes"
import { findWrestlerForMatch } from "@/lib/nhsca-duals-resolve-nc-wrestler"
import { NHSCA_DUALS_WEIGHTS, resultTypeTrackShort } from "@/lib/nhsca-duals-live-results/scoring"
import type { NhscaDualsDualRow, NhscaDualsMatchRow, NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"

export type DualBoutRow = {
  weight: string
  ncName: string
  ncNameShort: string
  opponentName: string
  opponentNameShort: string
  resultDisplay: string
  ncPoints: number
  opponentPoints: number
  ncWon: boolean
  opponentWon: boolean
  hasResult: boolean
  noteTags: string | null
}

export function shortWrestlerName(full: string): string {
  const trimmed = full.trim()
  if (!trimmed || trimmed === "—") return trimmed
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return trimmed
  const first = parts[0]!
  const last = parts[parts.length - 1]!
  return `${first[0]!.toUpperCase()}. ${last}`
}

export function buildDualBoutRows(
  snapshot: NhscaDualsResultsSnapshot,
  dual: NhscaDualsDualRow
): DualBoutRow[] {
  const dualMatches = snapshot.matches.filter((m) => m.dual_id === dual.id)

  return NHSCA_DUALS_WEIGHTS.map((weight) => {
    const match = dualMatches.find((m) => m.weight === weight)
    return boutRowFromMatch(weight, match, dual, snapshot)
  })
}

function boutRowFromMatch(
  weight: string,
  match: NhscaDualsMatchRow | undefined,
  dual: NhscaDualsDualRow,
  snapshot: NhscaDualsResultsSnapshot
): DualBoutRow {
  const wrestler = match
    ? findWrestlerForMatch(match, dual, snapshot.wrestlers)
    : snapshot.wrestlers.find((w) => w.team_id === dual.team_id && w.display_weight === weight && w.active)

  const hasResult = !!(match?.winner && match?.result_type && match.result_type !== "no_match")
  const ncWon = match?.winner === "nc"
  const opponentWon = match?.winner === "opponent"
  const ncName = wrestler?.name ?? "—"
  const opponentRaw = match?.opponent_wrestler_name?.trim() ?? ""
  const isForfeit =
    match?.result_type === "forfeit" || match?.result_type === "injury_default"
  const opponentName = opponentRaw || (isForfeit ? "" : "—")
  const { scoreLine } = splitMatchNotes(match?.notes)

  let resultDisplay = "—"
  if (hasResult && match?.result_type) {
    const short = resultTypeTrackShort(match.result_type)
    const score = scoreLine || (isForfeit ? "0-0" : null)
    resultDisplay = score ? `${short} ${score}` : short
  }

  return {
    weight,
    ncName,
    ncNameShort: shortWrestlerName(ncName),
    opponentName,
    opponentNameShort: opponentRaw ? shortWrestlerName(opponentRaw) : opponentName,
    resultDisplay,
    ncPoints: match?.nc_points ?? 0,
    opponentPoints: match?.opponent_points ?? 0,
    ncWon,
    opponentWon,
    hasResult,
    noteTags: displayNoteTags(match?.notes),
  }
}
