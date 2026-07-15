/**
 * Resolve NHSCA `high_school` scrape labels onto real NC schools for leaderboards.
 * City/state scraps like "Raleigh" or "NC" must not appear as schools.
 */

import { normalizeSchoolNameForDisplay } from "@/lib/school-normalization"

/** Labels that are never schools (state/country/unknown). */
const NHSCA_LEADERBOARD_JUNK = new Set([
  "nc",
  "n c",
  "n.c",
  "n.c.",
  "north carolina",
  "northcarolina",
  "usa",
  "us",
  "united states",
  "unknown",
  "n/a",
  "na",
  "none",
  "tbd",
  "homeschool",
  "home school",
  "home schooled",
  "unattached",
  "independent",
])

/**
 * Bare city names that commonly appear in NHSCA imports as the whole school field.
 * Only used when the label does **not** uniquely match a school_classifications row.
 */
const NHSCA_BARE_CITY_LABELS = new Set([
  "raleigh",
  "greensboro",
  "charlotte",
  "durham",
  "winston salem",
  "fayetteville",
  "wilmington",
  "asheville",
  "gastonia",
  "high point",
  "jacksonville",
  "greenville",
  "rocky mount",
  "chapel hill",
  "carrboro",
])

export type KnownSchoolEntry = {
  /** Display name for the leaderboard (prefer classification / cleaned name). */
  display: string
  /** Lowercase key used for matching. */
  key: string
}

export function nhscaSchoolLabelKey(name: string | null | undefined): string {
  if (!name) return ""
  return normalizeSchoolNameForDisplay(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function buildKnownSchoolEntries(schoolNames: string[]): KnownSchoolEntry[] {
  const byKey = new Map<string, KnownSchoolEntry>()
  for (const raw of schoolNames) {
    const display = normalizeSchoolNameForDisplay(raw) || raw.trim()
    const key = nhscaSchoolLabelKey(display)
    if (!key || key.length < 2) continue
    if (!byKey.has(key)) {
      byKey.set(key, { display, key })
    }
  }
  return [...byKey.values()]
}

/**
 * Map an NHSCA high_school string to a canonical school, or null to drop from leaderboard.
 */
export function resolveNhscaLeaderboardSchool(
  raw: string | null | undefined,
  known: KnownSchoolEntry[],
): string | null {
  const key = nhscaSchoolLabelKey(raw)
  if (!key || key.length < 2) return null
  if (NHSCA_LEADERBOARD_JUNK.has(key)) return null

  const exact = known.find((k) => k.key === key)
  if (exact) return exact.display

  const prefixMatches = known.filter((k) => k.key === key || k.key.startsWith(`${key} `))
  if (prefixMatches.length === 1) return prefixMatches[0].display
  if (prefixMatches.length > 1) {
    prefixMatches.sort((a, b) => a.key.length - b.key.length)
    // Ambiguous short stem (e.g. "Central") — only accept if one key equals raw key.
    const equal = prefixMatches.find((k) => k.key === key)
    return equal?.display ?? null
  }

  // Unique reverse containment for longer labels (e.g. "Cardinal Gibbons High" → Cardinal Gibbons).
  if (key.length >= 6) {
    const contained = known.filter((k) => key === k.key || key.startsWith(`${k.key} `) || key.includes(k.key))
    const tight = contained.filter((k) => key === k.key || key.startsWith(`${k.key} `) || k.key.startsWith(`${key} `))
    if (tight.length === 1) return tight[0].display
  }

  // Bare city with no unique school match → drop (e.g. "Raleigh", "Greensboro").
  if (NHSCA_BARE_CITY_LABELS.has(key)) return null

  // Unmatched free-text that looks like a real school name (multi-token with school cues).
  const looksLikeSchool =
    /\b(high|hs|charter|academy|prep|county|catholic|christian|school)\b/i.test(String(raw ?? "")) ||
    key.split(" ").length >= 2
  if (looksLikeSchool && key.split(" ").length >= 2) {
    // Keep historical / out-of-band names that aren't cities alone.
    return normalizeSchoolNameForDisplay(String(raw)) || String(raw).trim()
  }

  return null
}
