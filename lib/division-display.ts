/**
 * Division display/filter — division comes from colleges table.
 */

export const CANONICAL_DIVISIONS_FULL: string[] = [
  "NCAA Division I",
  "NCAA Division II",
  "NCAA Division III",
  "NAIA",
  "NJCAA",
]

function normDivision(v: string | null | undefined): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** True if athlete's division matches the filter (e.g. "NCAA Division I" or "all"). */
export function matchesDivisionFilter(division: string | null | undefined, filter: string): boolean {
  if (!filter || filter === "all") return true
  const d = normDivision(division)
  const f = normDivision(filter)
  if (!d) return false
  // Exact or canonical match
  if (d === f) return true
  // D1 / Division I / NCAA Division I
  if (/\bdivision\s*i(?!i)\b|\bd1\b|\bdi\b/.test(f) && /\bdivision\s*i(?!i)\b|\bd1\b|\bdi\b|\bncaa\s*division\s*i(?!i)\b/.test(d)) return true
  if (/\bdivision\s*ii\b|\bd2\b|\bdii\b/.test(f) && /\bdivision\s*ii\b|\bd2\b|\bdii\b|\bncaa\s*division\s*ii\b/.test(d)) return true
  if (/\bdivision\s*iii\b|\bd3\b|\bdiii\b/.test(f) && /\bdivision\s*iii\b|\bd3\b|\bdiii\b|\bncaa\s*division\s*iii\b/.test(d)) return true
  if (/\bnaia\b/.test(f) && /\bnaia\b/.test(d)) return true
  if (/\bnjcaa\b|\bjuco\b/.test(f) && /\bnjcaa\b|\bjuco\b/.test(d)) return true
  return false
}

export function getDivisionDisplayShort(division: string | null | undefined): string {
  const d = normDivision(division ?? "")
  if (!d) return ""
  if (/\bdivision\s*i(?!i)\b|\bd1\b|\bdi\b/.test(d)) return "D1"
  if (/\bdivision\s*ii\b|\bd2\b/.test(d)) return "D2"
  if (/\bdivision\s*iii\b|\bd3\b/.test(d)) return "D3"
  if (/\bnaia\b/.test(d)) return "NAIA"
  if (/\bnjcaa\b|\bjuco\b/.test(d)) return "NJCAA"
  return division ?? ""
}
