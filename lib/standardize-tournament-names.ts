/**
 * Standardize athlete names in tournament tables so one canonical spelling is stored.
 * Run the standardization script once (or after imports); then lookups can use a single name.
 *
 * 1. Apostrophes: curly/smart (U+2019, U+2018) → straight (')
 * 2. Known same-person spellings → one canonical (e.g. "Jackson Dettore" → "Jackson D'Ettore")
 */

const CURLY_RIGHT = "\u2019"
const CURLY_LEFT = "\u2018"

/** Normalize apostrophes to straight quote so "D'Ettore" and "D'Ettore" (curly) match. */
export function normalizeApostrophes(s: string): string {
  return (s ?? "")
    .replace(CURLY_RIGHT, "'")
    .replace(CURLY_LEFT, "'")
}

/** Key for canonical lookup: trim, lowercase, normalize apostrophes, collapse spaces. */
function keyForMatch(name: string): string {
  return normalizeApostrophes((name ?? "").trim().toLowerCase()).replace(/\s+/g, " ")
}

/**
 * Same-person spellings: each group lists variants; we store the first as canonical.
 * Add new groups here when imports or NCHSAA use different spellings than athlete profiles.
 */
const CANONICAL_GROUPS: string[][] = [
  ["Jackson D'Ettore", "Jackson Dettore", "Jackson D\u2019Ettore"],
  ["Holt Quincy", "Holton Quincy", "Holt Quickny", "Holton Quickny"],
  ["Colt Cambruzzi", "Colt Cambruzi", "Cole Cambruzzi", "Cole Cambruzi"],
  ["Carter Furman", "Carter Furmann", "Carter Forman"],
  ["Miller Menteer", "Miller Mentzer"],
  ["Nevaeh Williamson", "Nevaeh Willamson"],
  ["Cam Stinson", "Cameron Stinson"],
]

/** Map from normalized (keyForMatch) variant → canonical display name. */
const CANONICAL_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const group of CANONICAL_GROUPS) {
    const canonical = group[0]
    for (const spelling of group) {
      const key = keyForMatch(spelling)
      if (key) m[key] = canonical
    }
    const noApo = canonical.replace(/'/g, "").replace(CURLY_RIGHT, "").replace(CURLY_LEFT, "").trim()
    if (noApo && noApo !== canonical) m[keyForMatch(noApo)] = canonical
  }
  return m
})()

/**
 * Return the canonical spelling for display/storage.
 * - Trims and normalizes apostrophes.
 * - If the name is a known variant (e.g. "Jackson Dettore"), returns canonical ("Jackson D'Ettore").
 * - Otherwise returns the trimmed, apostrophe-normalized name.
 */
export function standardizeName(name: string): string {
  const raw = (name ?? "").trim()
  if (!raw) return raw
  const normalized = normalizeApostrophes(raw)
  const key = keyForMatch(normalized)
  const canonical = CANONICAL_MAP[key]
  if (canonical) return canonical
  return normalized
}
