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
 * - "Thompson, Ryan" → last=Thompson, first=Ryan
 * - "Mary Jane Smith" (no comma) → first=Mary, last="Jane Smith" (rest)
 */
export function parseFirstLastForNchsaa(athleteName: string): { first: string; last: string } | null {
  const raw = normalizeApostrophes((athleteName ?? "").trim())
  if (!raw) return null

  if (raw.includes(",")) {
    const [a, b] = raw.split(",").map((s) => s.trim())
    if (a && b) {
      return { last: a, first: b }
    }
    return null
  }

  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return null
  return { first: parts[0]!, last: parts.slice(1).join(" ") }
}

/**
 * Fetch NCHSAA state results for profile using **two** ILIKEs (first + last token), so both
 * `Ryan Thompson` and `Thompson, Ryan` match — a single `%Ryan Thompson%` does **not** match `Thompson, Ryan`.
 *
 * **No year filter** on this query: all years are returned; `getNCHSAAResultsForProfile` may still
 * apply a plausible grad-year window when merging with other strategies.
 *
 * @see docs/RECRUITNC-PROFILE-NAME-MATCHING-DETTORE.md — "2026 missing (e.g. Ryan Thompson)"
 */
export async function fetchNchsaaResultsForAthleteProfile(
  supabase: SupabaseClient,
  athleteName: string
): Promise<NchsaaProfileFetchRow[]> {
  const parsed = parseFirstLastForNchsaa(athleteName)
  if (!parsed) return []

  const pFirst = `%${escapeForIlike(parsed.first)}%`
  const pLast = `%${escapeForIlike(parsed.last)}%`

  const { data, error } = await supabase
    .from("wrestling_nchsaa_results")
    .select("year, classification, weight_class, place, school, wrestler_name")
    .ilike("wrestler_name", pFirst)
    .ilike("wrestler_name", pLast)
    .order("year", { ascending: false })

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
