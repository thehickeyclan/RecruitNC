import { escapeForIlike } from "@/lib/nchsaa-results"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"
import { normalizeApostrophes } from "@/lib/standardize-tournament-names"
import { getNameVariants } from "@/lib/tournament-tables"
import { schoolCoreName, schoolsLooselyEqual } from "@/lib/public-imports/normalize"

/**
 * Punctuation-safe school lookup for PostgREST ILIKE.
 * `Newton Conover`, `Newton-Conover`, and `Newton-Conover High School` all match
 * `%newton%conover%` without loosening the final in-memory identity check.
 */
export function schoolDossierIlikePattern(schoolName: string, anchorStart = false): string {
  const tokens = schoolCoreName(schoolName).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return "%"
  const body = tokens.map(escapeForIlike).join("%")
  return `${anchorStart ? "" : "%"}${body}%`
}

/** Exact school identity after stripping punctuation and generic school suffixes. */
export function schoolNamesMatchForDossier(cell: string, canonical: string): boolean {
  return schoolsLooselyEqual(cell, canonical)
}

/** PostgREST `.or()` values with spaces/commas must be double-quoted. */
export function ilikeOrClause(column: string, values: string[]): string {
  return values
    .map((v) => {
      const pat = `%${escapeForIlike(v)}%`
      const quoted = `"${pat.replace(/"/g, '\\"')}"`
      return `${column}.ilike.${quoted}`
    })
    .join(",")
}

/**
 * Prefer "First Last" forms for SQL — avoid relying only on "Last, First" (commas break unquoted `.or()`).
 */
export function nameSearchKeysForSchoolDossier(knownWrestlers: string[]): string[] {
  const keys = new Set<string>()
  for (const w of knownWrestlers) {
    const t = normalizeApostrophes(w.trim())
    if (t.length < 3) continue
    keys.add(t)
    const parts = t.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      keys.add(`${parts[0]} ${parts[parts.length - 1]}`)
    }
    for (const v of getNameVariants(t)) {
      const s = normalizeApostrophes(v.trim())
      if (s.length >= 5 && !s.includes(",")) keys.add(s)
    }
  }
  return [...keys].filter((k) => k.length >= 3).slice(0, 120)
}

export function schoolDossierAthleteMatchesKnown(athleteName: string, knownWrestlers: string[]): boolean {
  const rn = String(athleteName ?? "").trim()
  if (!rn) return false
  for (const w of knownWrestlers) {
    if (!String(w).trim()) continue
    if (namesLikelySamePerson(rn, w)) return true
  }
  return false
}

/** School ILIKE patterns: full name + stripped "High School" / "HS". */
export function schoolIlikePatterns(canonical: string): string[] {
  const base = canonical.trim()
  const patterns = new Set<string>([`%${escapeForIlike(base)}%`])
  patterns.add(schoolDossierIlikePattern(base))
  const stripped = base
    .replace(/\s+(high\s+school|hs|school)\s*$/i, "")
    .replace(/^the\s+/i, "")
    .trim()
  if (stripped.length >= 4 && stripped.toLowerCase() !== base.toLowerCase()) {
    patterns.add(`%${escapeForIlike(stripped)}%`)
  }
  return [...patterns]
}
