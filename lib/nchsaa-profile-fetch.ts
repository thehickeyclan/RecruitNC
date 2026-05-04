import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * NCHSAA rows for unified / view-profile — same shape as `NchsaaRowForProfile` in `lib/nchsaa-results.ts`.
 * Kept in this file to avoid circular imports with that module.
 */
export type NchsaaProfileFetchRow = {
  year: number
  classification: string
  weight_class: string
  place: number | null
  school: string
  wrestler_name: string
}

function escapeForIlike(s: string): string {
  return (s ?? "").replace(/'/g, "''")
}

function normalizeApostrophes(s: string): string {
  return (s ?? "")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
}

/**
 * Parse "First Last" or "Last, First" into first + last tokens for AND ILIKE matching.
 * - "Ryan Thompson" → first=Ryan, last=Thompson
 * - "Ryan M. Thompson" → first=Ryan, last=Thompson (NOT "M. Thompson" — that broke DB rows like "Thompson, Ryan")
 * - "Thompson, Ryan" / "Thompson, Ryan M." → last=Thompson, first=Ryan (first token after comma only)
 * - "Mary Jane Smith" → first=Mary, last=Smith (first + last token when 3+ parts)
 */
export function parseFirstLastForNchsaa(athleteName: string): { first: string; last: string } | null {
  const raw = normalizeApostrophes((athleteName ?? "").trim())
  if (!raw) return null

  if (raw.includes(",")) {
    const [a, b] = raw.split(",").map((s) => s.trim())
    if (a && b) {
      const afterParts = b.split(/\s+/).filter(Boolean)
      const firstAfter = afterParts[0] ?? b
      return { last: a.trim(), first: firstAfter.trim() }
    }
    return null
  }

  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return null
  if (parts.length === 2) return { first: parts[0]!, last: parts[1]! }
  // 3+ tokens: first word + last word (handles middle names / initials)
  return { first: parts[0]!, last: parts[parts.length - 1]! }
}

/**
 * Fetch NCHSAA state results for profile using **two** ILIKEs (first + last token), so both
 * `Ryan Thompson` and `Thompson, Ryan` match — a single `%Ryan Thompson%` does **not** match `Thompson, Ryan`.
 *
 * When `graduationYear` is set, the query adds a **year window** (grad−5 … grad+2) so we stay under
 * PostgREST default row limits when many athletes share tokens like "Ryan" + "Thompson".
 *
 * @see docs/2026-STATE-QUALIFIERS-FOR-RECRUITNC.md — canonical table `wrestling_nchsaa_results`
 * @see docs/RECRUITNC-PROFILE-NAME-MATCHING-DETTORE.md — "2026 missing (e.g. Ryan Thompson)"
 */
export async function fetchNchsaaResultsForAthleteProfile(
  supabase: SupabaseClient,
  athleteName: string,
  options?: { graduationYear?: number }
): Promise<NchsaaProfileFetchRow[]> {
  const parsed = parseFirstLastForNchsaa(athleteName)
  if (!parsed) return []

  const pFirst = `%${escapeForIlike(parsed.first)}%`
  const pLast = `%${escapeForIlike(parsed.last)}%`

  let q = supabase
    .from("wrestling_nchsaa_results")
    .select("year, classification, weight_class, place, school, wrestler_name")
    .ilike("wrestler_name", pFirst)
    .ilike("wrestler_name", pLast)

  const gy = options?.graduationYear
  if (gy != null && !Number.isNaN(Number(gy))) {
    const y = Number(gy)
    /** Keep in sync with `plausibleNchsaaYearsForGradYear` in nchsaa-results.ts (wide enough for young grads + SQ). */
    q = q.gte("year", y - 14).lte("year", y + 2)
  }

  const { data, error } = await q.order("year", { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    year: Number(row.year),
    classification: (row.classification ?? "").toString(),
    weight_class: (row.weight_class ?? "").toString(),
    place: row.place != null ? Number(row.place) : null,
    school: (row.school ?? "").toString(),
    wrestler_name: (row.wrestler_name ?? "").toString(),
  }))
}
