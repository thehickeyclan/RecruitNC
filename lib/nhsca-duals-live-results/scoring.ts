import type { NhscaDualsMatchWinner, NhscaDualsResultType } from "./types"

/** Official NHSCA high school weights (display order) */
export const NHSCA_DUALS_WEIGHTS = [
  "106",
  "113",
  "120",
  "126",
  "132",
  "138",
  "145",
  "152",
  "160",
  "170",
  "182",
  "195",
  "220",
  "285",
] as const

export type NhscaDualsWeight = (typeof NHSCA_DUALS_WEIGHTS)[number]

/** Map internal roster weight labels to NHSCA display weight */
export function toDisplayWeight(weightClass: string): string {
  const w = weightClass.trim().toUpperCase()
  if (w === "HWT" || w === "285") return "285"
  if (w === "190" || w === "195") return "195"
  if (w === "144") return "145"
  if (w === "183") return "182"
  const n = parseInt(w, 10)
  if (!Number.isNaN(n) && NHSCA_DUALS_WEIGHTS.includes(String(n) as NhscaDualsWeight)) {
    return String(n)
  }
  return w
}

export const RESULT_TYPE_OPTIONS: {
  value: NhscaDualsResultType
  label: string
  short: string
  points: number
}[] = [
  { value: "fall", label: "Fall / Pin", short: "FALL", points: 6 },
  { value: "forfeit", label: "Forfeit", short: "FF", points: 6 },
  { value: "injury_default", label: "Injury Default", short: "INJ", points: 6 },
  { value: "dq", label: "Disqualification", short: "DQ", points: 6 },
  { value: "tech_fall", label: "Tech Fall", short: "TF", points: 5 },
  { value: "major_decision", label: "Major Decision", short: "MD", points: 4 },
  { value: "decision", label: "Decision", short: "DEC", points: 3 },
  { value: "draw", label: "Draw", short: "DRAW", points: 0 },
  { value: "no_match", label: "No Match", short: "NM", points: 0 },
]

export function pointsForResultType(resultType: NhscaDualsResultType | null | undefined): number {
  if (!resultType) return 0
  return RESULT_TYPE_OPTIONS.find((o) => o.value === resultType)?.points ?? 0
}

export function resultTypeLabel(resultType: NhscaDualsResultType | null | undefined): string {
  if (!resultType) return "—"
  return RESULT_TYPE_OPTIONS.find((o) => o.value === resultType)?.short ?? resultType
}

/** Track/Flo-style abbreviations for bout headers (F, TF, MD, DEC). */
export function resultTypeTrackShort(resultType: NhscaDualsResultType | null | undefined): string {
  switch (resultType) {
    case "fall":
      return "F"
    case "tech_fall":
      return "TF"
    case "major_decision":
      return "MD"
    case "decision":
      return "DEC"
    case "forfeit":
      return "FOR"
    case "injury_default":
      return "INJ"
    case "dq":
      return "DQ"
    case "draw":
      return "DRAW"
    default:
      return resultTypeLabel(resultType)
  }
}

export function computeMatchPoints(
  winner: NhscaDualsMatchWinner | null,
  resultType: NhscaDualsResultType | null
): { nc_points: number; opponent_points: number } {
  const pts = pointsForResultType(resultType)
  if (!winner || winner === "draw" || winner === "no_match" || pts === 0) {
    return { nc_points: 0, opponent_points: 0 }
  }
  if (winner === "nc") return { nc_points: pts, opponent_points: 0 }
  return { nc_points: 0, opponent_points: pts }
}

export function sumDualScores(matches: { nc_points: number; opponent_points: number }[]): {
  nc_score: number
  opponent_score: number
} {
  return matches.reduce(
    (acc, m) => ({
      nc_score: acc.nc_score + (m.nc_points ?? 0),
      opponent_score: acc.opponent_score + (m.opponent_points ?? 0),
    }),
    { nc_score: 0, opponent_score: 0 }
  )
}

export function inferDualStatus(
  status: string,
  matches: { winner: string | null; result_type: string | null }[]
): "not_started" | "in_progress" | "final" {
  if (status === "final") return "final"
  const hasResult = matches.some((m) => m.winner && m.result_type && m.result_type !== "no_match")
  if (!hasResult) return "not_started"
  return "in_progress"
}
