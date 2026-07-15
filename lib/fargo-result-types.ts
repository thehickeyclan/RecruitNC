/** Canonical Fargo bout result_type values. */

export const FARGO_RESULT_TYPES = [
  "FALL",
  "TF",
  "MAJ",
  "DEC",
  "FF",
  "DEFAULT",
  "DQ",
  "INJ",
  "OTHER",
] as const

export type FargoResultType = (typeof FARGO_RESULT_TYPES)[number]

export function normalizeFargoResultType(raw: unknown): FargoResultType {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
  if (!s) return "OTHER"
  if (/\bFALL\b|\bPIN\b|\bF\b/.test(s) && !/FORFEIT|FF/.test(s)) return "FALL"
  if (/\bTF\b|TECH/.test(s)) return "TF"
  if (/\bMAJ\b|MAJOR/.test(s)) return "MAJ"
  if (/\bDEC\b|DECISION|SUP/.test(s)) return "DEC"
  if (/\bFF\b|FORFEIT/.test(s)) return "FF"
  if (/\bDEFAULT\b|\bDFT\b/.test(s)) return "DEFAULT"
  if (/\bDQ\b|DISQ/.test(s)) return "DQ"
  if (/\bINJ\b|INJURY/.test(s)) return "INJ"
  return "OTHER"
}

/** Parse "Wrestler A (NC) over Wrestler B (OH) (TF 14-4)" style summaries. */
export function parseOverSummary(summary: string): {
  winner_name: string
  winner_state: string | null
  loser_name: string
  loser_state: string | null
  result_type: FargoResultType
  score: string | null
} | null {
  const s = summary.trim()
  if (!s || /\bbye\b/i.test(s)) return null
  const m = s.match(
    /^(.+?)\s*\(([^)]+)\)\s+over\s+(.+?)\s*\(([^)]+)\)\s*(?:\(([^)]+)\))?\s*$/i,
  )
  if (!m) return null
  const resultRaw = (m[5] ?? "").trim()
  const scoreMatch = resultRaw.match(/(\d+\s*-\s*\d+)/)
  return {
    winner_name: m[1].trim(),
    winner_state: m[2].trim().toUpperCase().slice(0, 3) || null,
    loser_name: m[3].trim(),
    loser_state: m[4].trim().toUpperCase().slice(0, 3) || null,
    result_type: normalizeFargoResultType(resultRaw),
    score: scoreMatch ? scoreMatch[1].replace(/\s+/g, "") : resultRaw || null,
  }
}
