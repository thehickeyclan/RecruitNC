/**
 * Pure heuristics for athlete-name fast path (no Supabase imports — safe for unit tests).
 */

import {
  extractSearchablePhrase,
  stripConversationalNoise,
  tokenizeMeaningfulWords,
} from "./search-normalize"
import { scoreAthleteNameMatch } from "./fuzzy-utils"
import { isLikelySchoolWrestlingLookup } from "./school-name-fast-path-detect"

/** Topics that must keep the full agent path (not a bare athlete lookup). */
const LOOKUP_TOPIC_BLOCK =
  /\b(ranking|rankings|champ(?:ion|s)?|nhsca|fargo|super\s*32|super32|dual(?:s)?|all[- ]?american|record book|winningest|leaderboard|how many|most titles|state tournament|class of|committed to|college commits?|school wrestling|high school wrestling)\b/i

export function isLikelyAthleteNameLookup(message: string): boolean {
  const raw = (message ?? "").trim()
  if (raw.length < 3 || raw.length > 80) return false
  if (isLikelySchoolWrestlingLookup(raw)) return false
  if (LOOKUP_TOPIC_BLOCK.test(raw)) return false
  const phrase = extractSearchablePhrase(raw) || stripConversationalNoise(raw)
  const tokens = tokenizeMeaningfulWords(phrase)
  if (tokens.length < 2 || tokens.length > 4) return false
  if (/\b(county|academy|prep|christian|catholic|hs)\b/i.test(phrase) && tokens.length <= 2) {
    return false
  }
  return true
}

function rowNameParts(row: Record<string, unknown>): { first: string; last: string; display: string } {
  const display = String(row.name ?? "").trim()
  const first = String(
    row.first_name ?? row.firstname ?? row.firstName ?? row["first_name"] ?? "",
  ).trim()
  const last = String(row.last_name ?? row.lastname ?? row.lastName ?? row["last_name"] ?? "").trim()
  const keys = Object.keys(row)
  const fnKey = keys.find((k) => /^(first_?name|firstname)$/i.test(k))
  const lnKey = keys.find((k) => /^(last_?name|lastname)$/i.test(k))
  return {
    display,
    first: first || (fnKey ? String(row[fnKey] ?? "").trim() : ""),
    last: last || (lnKey ? String(row[lnKey] ?? "").trim() : ""),
  }
}

export function pickClearAthleteId(
  phrase: string,
  rows: Record<string, unknown>[],
  disambiguation: unknown,
): string | null {
  if (Array.isArray(disambiguation) && disambiguation.length > 0) return null
  if (!rows.length) return null

  const phraseLow = phrase.toLowerCase().replace(/\s+/g, " ").trim()
  const scored = rows
    .map((row) => {
      const { first, last, display } = rowNameParts(row)
      const score = scoreAthleteNameMatch(phraseLow, first, last, display)
      return { row, score, display }
    })
    .sort((a, b) => b.score - a.score)

  const exact = scored.filter((s) => s.display.toLowerCase().replace(/\s+/g, " ").trim() === phraseLow)
  if (exact.length === 1) {
    const id = String(exact[0].row.id ?? "").trim()
    return id || null
  }

  const top = scored[0]
  if (!top || top.score < 0.9) return null

  const runner = scored[1]
  if (runner && runner.score >= top.score - 0.05 && runner.score >= 0.85) return null

  const id = String(top.row.id ?? "").trim()
  return id || null
}

export function extractAthleteLookupPhrase(message: string): string {
  return (extractSearchablePhrase(message) || stripConversationalNoise(message)).trim()
}
