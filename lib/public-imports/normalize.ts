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
  const school = normText(schoolName)
    .replace(/\bhigh school\b/g, "")
    .replace(/\bacademy\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return `${effectiveYear}|${school}`
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

export function schoolsLooselyEqual(a: unknown, b: unknown): boolean {
  const strip = (s: string) =>
    s
      .replace(/\([^)]*\)/g, " ") // location qualifiers compared separately
      .replace(/\bhigh school\b/g, "")
      .replace(/\bsenior high school\b/g, "")
      .replace(/\bacademy\b/g, "")
      .replace(/\bschool\b/g, "")
      .replace(/\./g, " ")
      .replace(/[-–—]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

  const paren = (raw: string) => {
    const m = String(raw ?? "").match(/\(([^)]+)\)/)
    return m ? normText(m[1]) : ""
  }

  const rawA = String(a ?? "")
  const rawB = String(b ?? "")
  const pa = paren(rawA)
  const pb = paren(rawB)
  // Both named with locations must agree (Northside Jacksonville ≠ Pinetown)
  if (pa && pb && pa !== pb) return false

  const na = strip(normText(rawA))
  const nb = strip(normText(rawB))
  if (!na || !nb) return na === nb
  if (na === nb || na.startsWith(nb) || nb.startsWith(na)) return true

  const tokens = (s: string) => s.split(" ").filter(Boolean)
  const ta = tokens(na)
  const tb = tokens(nb)
  const lastA = ta[ta.length - 1] || ""
  const lastB = tb[tb.length - 1] || ""

  // Ambiguous last tokens — require stronger overlap
  const AMBIGUOUS = new Set([
    "central",
    "north",
    "south",
    "east",
    "west",
    "union",
    "county",
    "charter",
    "prep",
    "preparatory",
    "community",
    "early",
    "college",
    "tech",
    "technology",
    "leadership",
    "classical",
    "independent",
  ])

  // "William Amos Hough" ↔ "Hough", "Emsley A Laney" ↔ "Laney"
  if (
    lastA.length >= 5 &&
    lastA === lastB &&
    !AMBIGUOUS.has(lastA)
  ) {
    return true
  }

  // Shorter name is a whole-word suffix/prefix of the longer (min length 5)
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na]
  if (shorter.length >= 5) {
    const re = new RegExp(`(?:^|\\s)${shorter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`)
    if (re.test(longer)) return true
  }

  return false
}
