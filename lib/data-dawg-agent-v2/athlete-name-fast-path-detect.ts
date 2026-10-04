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
import { normalizeApostrophes, namesReferToSamePerson } from "@/lib/athlete-name-match"

/** Topics that must keep the full agent path (not a bare athlete lookup). */
const LOOKUP_TOPIC_BLOCK =
  /\b(ranking|rankings|champ(?:ion|s)?|nchsaa|nhsca|fargo|super\s*32|super32|dual(?:s)?|all[- ]?american|record book|winningest|leaderboard|how many|most titles|state tournament|state results|class of|committed to|college commits?|school wrestling|high school wrestling)\b/i

/** Fold curly quotes / spacing so "Kevin O'Brien" matches "Kevin O’Brien" / "Kevin OBrien". */
export function foldAthleteLookupName(s: string): string {
  return normalizeApostrophes((s ?? "").trim().toLowerCase())
    .replace(/`/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function foldAthleteLookupNameLoose(s: string): string {
  return foldAthleteLookupName(s).replace(/'/g, "")
}

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

  const phraseFold = foldAthleteLookupName(phrase)
  const phraseLoose = foldAthleteLookupNameLoose(phrase)

  const scored = rows
    .map((row) => {
      const { first, last, display } = rowNameParts(row)
      const score = scoreAthleteNameMatch(phraseFold, first, last, display)
      return { row, score, display }
    })
    .sort((a, b) => b.score - a.score)

  const exact = scored.filter((s) => {
    const d = foldAthleteLookupName(s.display)
    const dLoose = foldAthleteLookupNameLoose(s.display)
    return (
      d === phraseFold ||
      dLoose === phraseLoose ||
      namesReferToSamePerson(phrase, s.display)
    )
  })
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


/**
 * A follow-up about whoever the last turn was about.
 *
 * "What was his record at Super32?" carries no name, so the fast path did not fire and the model
 * was left to search by name — which found a different Elijah Brown. There are four: the one from
 * New York the conversation had just established, one in North Carolina whose Super 32 records sit
 * in our NC-collected table, one in Pennsylvania and one in Indiana. The answer quietly switched
 * wrestler between one message and the next.
 *
 * Only a pronoun or an obvious continuation counts. A new question that happens to omit a name
 * ("who won the TOC") must not inherit the last subject.
 */
const FOLLOW_UP_RE =
  /\b(he|him|his|she|her|hers|they|them|their)\b|^\s*(and|what about|how about|also|any)\b/i

export function carriedAthletePhrase(
  message: string,
  history: Array<{ role?: string; content?: string }> | undefined,
): string | null {
  const text = String(message ?? "")
  // A message naming someone resolves on its own; nothing to carry.
  if (isLikelyAthleteNameLookup(text)) return null
  if (!FOLLOW_UP_RE.test(text)) return null
  const userTurns = (history ?? []).filter((h) => h.role === "user" && typeof h.content === "string")
  // Most recent first, and only a few back: the subject goes stale quickly.
  for (const turn of userTurns.slice(-4).reverse()) {
    const prior = String(turn.content)
    if (isLikelyAthleteNameLookup(prior)) return extractAthleteLookupPhrase(prior)
  }
  return null
}


/**
 * A name pasted out of a roster or bracket table.
 *
 * "Colten Jones Capital Wrestling Club Main   •   170   •   HS Junior" is a row someone copied,
 * and it failed every check: it did not look like a name lookup, and the phrase it produced —
 * "colten jones capital club main 170 junior" — matched nobody. He is in the data: third at 165
 * in Virginia 4A, with 37 bouts.
 *
 * The name is the leading run of capitalised words; everything after the first club word, bullet,
 * weight or grade is the row's other columns.
 */
const ROSTER_NOISE_RE =
  /[•|]|\b(\d{2,3})\b|\b(hs|high school|jr|sr|so|fr|junior|senior|sophomore|freshman|main|club|wrestling|academy|wc|rtc|team)\b/i

export function nameFromPastedRow(message: string): string | null {
  const text = String(message ?? "").replace(/\s+/g, " ").trim()
  if (!text || !ROSTER_NOISE_RE.test(text)) return null
  /*
   * The first two capitalised words and no more. Three would swallow the club: the row reads
   * "Colten Jones Capital Wrestling Club", and "Colten Jones Capital" matches nobody.
   */
  const m = text.match(/^([A-Z][A-Za-z'’`-]+)\s+([A-Z][A-Za-z'’`-]+)\b/)
  if (!m) return null
  return `${m[1]} ${m[2]}`
}
