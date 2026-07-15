/** Shared normalization for public-source import diffs. */

/** Straight apostrophe for storage / unique keys (NCHSAA pages often use ` or ’). */
export function canonicalizeWrestlerName(s: unknown): string {
  return String(s ?? "")
    .replace(/[`´′’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function normText(s: unknown): string {
  return canonicalizeWrestlerName(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** Compare names ignoring "Last, First" vs "First Last". */
export function namesLooselyEqual(a: unknown, b: unknown): boolean {
  const na = normText(a)
  const nb = normText(b)
  if (!na || !nb) return na === nb
  if (na === nb) return true
  const flip = (s: string) => {
    if (!s.includes(",")) return s
    const [last, ...rest] = s.split(",")
    return `${rest.join(",").trim()} ${last.trim()}`.replace(/\s+/g, " ").trim()
  }
  return flip(na) === flip(nb) || flip(na) === nb || na === flip(nb)
}

export function dualNaturalKey(year: number, division: string): string {
  return `${year}|${normText(division)}`
}

/** Stable key for school membership rows (year + school, HS suffix ignored). */
export function classificationNaturalKey(effectiveYear: number, schoolName: string): string {
  return `${effectiveYear}|${schoolCoreName(schoolName)}`
}

export function placerNaturalKey(
  year: number,
  classification: string,
  weightClass: string,
  place: number,
  gender?: string | null,
): string {
  const g = gender === "M" || gender === "F" ? gender : ""
  return `${year}|${normText(classification)}|${normText(weightClass)}|${place}|${g}`
}

/** Core school string for classification matching (no HS / academy / punctuation). */
export function schoolCoreName(raw: unknown): string {
  return normText(raw)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bjunior-senior\b/g, " ")
    .replace(/\bsenior high school\b/g, " ")
    .replace(/\bhigh school\b/g, " ")
    .replace(/\bacademy\b/g, " ")
    .replace(/\bschool\b/g, " ")
    .replace(/\./g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function schoolParenLocation(raw: unknown): string {
  const m = String(raw ?? "").match(/\(([^)]+)\)/)
  return m ? normText(m[1]) : ""
}

const DIRECTION_PREFIX = new Set([
  "north",
  "south",
  "east",
  "west",
  "northern",
  "southern",
  "eastern",
  "western",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
  "central",
  "mid",
])

/**
 * Loose school match for placers / duals (existing behavior).
 * Exact after stripping High School / Academy — no shared-token false positives.
 */
export function schoolsLooselyEqual(a: unknown, b: unknown): boolean {
  const pa = schoolParenLocation(a)
  const pb = schoolParenLocation(b)
  if (pa && pb && pa !== pb) return false

  const na = schoolCoreName(a)
  const nb = schoolCoreName(b)
  if (!na || !nb) return na === nb
  return na === nb
}

/**
 * Last tokens that appear exactly once across the given school name list.
 * Used so "Hough" ↔ "William Amos Hough" can match only when no other school
 * shares that last token (blocks Guilford / Wilkes / Creek collisions).
 */
export function uniqueClassificationLastTokens(schoolNames: string[]): Set<string> {
  const freq = new Map<string, number>()
  for (const name of schoolNames) {
    const tokens = schoolCoreName(name).split(" ").filter(Boolean)
    const last = tokens[tokens.length - 1] || ""
    if (last.length < 5) continue
    freq.set(last, (freq.get(last) || 0) + 1)
  }
  const unique = new Set<string>()
  for (const [tok, n] of freq) {
    if (n === 1) unique.add(tok)
  }
  return unique
}

/**
 * Classification membership match: exact core, or unique last-token formal↔short.
 * Do not use for placers/duals.
 */
export function classificationSchoolsEqual(
  a: unknown,
  b: unknown,
  uniqueLastTokens: Set<string>,
): boolean {
  const pa = schoolParenLocation(a)
  const pb = schoolParenLocation(b)
  if (pa && pb && pa !== pb) return false

  const na = schoolCoreName(a)
  const nb = schoolCoreName(b)
  if (!na || !nb) return na === nb
  if (na === nb) return true

  const ta = na.split(" ").filter(Boolean)
  const tb = nb.split(" ").filter(Boolean)
  const lastA = ta[ta.length - 1] || ""
  const lastB = tb[tb.length - 1] || ""
  if (lastA.length < 5 || lastA !== lastB) return false
  if (!uniqueLastTokens.has(lastA)) return false

  // One side must be the bare surname; the other a longer formal or campus name
  if (!(ta.length === 1 || tb.length === 1)) return false
  if (!(ta.length >= 2 || tb.length >= 2)) return false

  const multi = ta.length > 1 ? ta : tb
  // Block East/West/North… compounds even if token somehow unique
  if (DIRECTION_PREFIX.has(multi[0])) return false

  return true
}
