/**
 * Parses a RankWrestler class listing pasted straight out of the page.
 *
 * Their table copies as a rank on its own line, the wrestler's name, any credential lines they
 * show ("2x placer", "State champ"), a "Resume" toggle, then one tab-separated row carrying the
 * school, weight, grade, classification, region and record followed by their own percentages.
 *
 * Kept as a pure parser so the shape can be tested without a database, the same way the GoFan
 * coach-ticket paste is handled. Nothing here is transcribed by hand — a mistyped rank credits
 * the wrong wrestler.
 */

export type RankWrestlerRow = {
  rank: number
  wrestlerName: string
  school: string | null
  weightClass: string | null
  grade: string | null
  classification: string | null
  region: string | null
  record: string | null
  /** "State champ", "2x placer", "2025-26 3rd" — whatever they printed under the name. */
  notes: string[]
}

const RANK_LINE = /^(\d{1,3})\s*$/
const RECORD_CELL = /^\d+\s*-\s*\d+$/
/** Lines their table emits that are controls, not data. */
const CONTROL_LINES = new Set(["resume", "▼", "▲"])

function clean(value: string | undefined): string | null {
  const trimmed = String(value ?? "").trim()
  return trimmed ? trimmed : null
}

export function parseRankWrestlerPaste(paste: string): RankWrestlerRow[] {
  const lines = String(paste ?? "").split(/\r?\n/)
  const out: RankWrestlerRow[] = []
  let i = 0

  while (i < lines.length) {
    const rankMatch = lines[i]!.trim().match(RANK_LINE)
    if (!rankMatch) {
      i += 1
      continue
    }
    const rank = Number(rankMatch[1])
    i += 1

    // The name is the next line with anything on it.
    let wrestlerName = ""
    while (i < lines.length && !wrestlerName) {
      const candidate = lines[i]!.trim()
      i += 1
      if (candidate && !CONTROL_LINES.has(candidate.toLowerCase())) wrestlerName = candidate
    }
    if (!wrestlerName) continue

    // Then the credential lines, then the one row carrying tabs.
    const notes: string[] = []
    let detail: string[] | null = null
    while (i < lines.length) {
      const raw = lines[i]!
      const trimmed = raw.trim()
      // A new rank means this wrestler had no detail row; do not consume it.
      if (RANK_LINE.test(trimmed)) break
      i += 1
      if (!trimmed || CONTROL_LINES.has(trimmed.toLowerCase())) continue
      if (raw.includes("\t")) {
        detail = raw.split("\t").map((cell) => cell.trim())
        break
      }
      notes.push(trimmed)
    }

    if (!detail) {
      out.push({
        rank,
        wrestlerName,
        school: null,
        weightClass: null,
        grade: null,
        classification: null,
        region: null,
        record: null,
        notes,
      })
      continue
    }

    // school, weight, grade, classification, region, record, then their percentages.
    const recordIndex = detail.findIndex((cell) => RECORD_CELL.test(cell))
    out.push({
      rank,
      wrestlerName,
      school: clean(detail[0]),
      weightClass: clean(detail[1]),
      grade: clean(detail[2]),
      classification: clean(detail[3]),
      region: clean(detail[4]),
      record: recordIndex >= 0 ? clean(detail[recordIndex])?.replace(/\s+/g, " ") ?? null : null,
      notes,
    })
  }

  return out
}

/** The class a "Sr"/"Jr"/"So"/"Fr" grade graduates in, given the season's spring year. */
export function classYearForGrade(grade: string | null, seasonEndYear: number): number | null {
  switch (String(grade ?? "").trim().toLowerCase()) {
    case "sr":
      return seasonEndYear
    case "jr":
      return seasonEndYear + 1
    case "so":
      return seasonEndYear + 2
    case "fr":
      return seasonEndYear + 3
    default:
      return null
  }
}
