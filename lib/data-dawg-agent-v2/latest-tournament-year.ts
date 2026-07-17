/**
 * Resolve "the most recent season" from the database.
 *
 * Why this exists: `nchsaa_state_tournament_by_year` required a year, so a question with no
 * year ("who won 4A state at 132?") forced the model to invent one — it answered with 2023
 * out of the 14 years on file, stated it confidently, and never mentioned that it had chosen.
 * A year has to come from the data, not from the model.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
import { matchesNchsaaClassificationFilter } from "@/lib/data-dawg-tournament-results-query"

/**
 * NCHSAA realigned for the 2026 season: 1A–4A became 1A/2A + 3A–8A. So "4A" in 2025 and "4A"
 * in 2026 are different fields of schools, and any cross-boundary comparison needs saying so.
 * matchesNchsaaClassificationFilter already pivots on this year — keep them in step.
 */
export const NCHSAA_REALIGNMENT_YEAR = 2026

type YearRow = { year: number; classification: string }

let cache: { rows: YearRow[]; at: number } | null = null
/** Seasons change once a year; a short TTL is only to survive a long-lived serverless isolate. */
const TTL_MS = 10 * 60 * 1000

async function loadYearClassifications(): Promise<YearRow[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows

  const admin = getSupabaseAdmin()
  const rows: YearRow[] = []
  const batch = 1000
  for (let offset = 0; ; offset += batch) {
    const { data, error } = await admin
      .from("wrestling_nchsaa_results")
      .select("year,classification")
      .order("year", { ascending: false })
      .range(offset, offset + batch - 1)
    if (error) throw new Error(error.message)
    const got = (data ?? []) as YearRow[]
    rows.push(...got)
    if (got.length < batch || rows.length >= 20000) break
  }

  cache = { rows, at: Date.now() }
  return rows
}

/** Every NCHSAA season we hold results for, newest first. */
export async function listNchsaaStateYears(): Promise<number[]> {
  const rows = await loadYearClassifications()
  return [...new Set(rows.map((r) => Number(r.year)).filter(Number.isFinite))].sort((a, b) => b - a)
}

export type LatestYearResult = {
  /** Newest season with results for this division, or null if we hold none. */
  year: number | null
  /** Newest first — lets the caller offer real alternatives instead of guessing. */
  availableYears: number[]
  /** True when the division's meaning changed at the realignment and older years exist too. */
  spansRealignment: boolean
}

/**
 * Newest season that actually has results for `classification`.
 *
 * Resolved against the same matcher the fetch uses, so "8A" correctly resolves to 2026 (it
 * exists nowhere else) rather than to the newest year overall.
 */
export async function getLatestNchsaaStateYear(classification?: string | null): Promise<LatestYearResult> {
  const rows = await loadYearClassifications()
  const wanted = classification?.trim() || null

  const years = [...new Set(rows.map((r) => Number(r.year)).filter(Number.isFinite))].sort((a, b) => b - a)
  if (!wanted) {
    return { year: years[0] ?? null, availableYears: years, spansRealignment: false }
  }

  const matching = years.filter((y) =>
    rows.some((r) => Number(r.year) === y && matchesNchsaaClassificationFilter(r.classification, wanted, y)),
  )

  return {
    year: matching[0] ?? null,
    availableYears: matching,
    spansRealignment:
      matching.some((y) => y >= NCHSAA_REALIGNMENT_YEAR) && matching.some((y) => y < NCHSAA_REALIGNMENT_YEAR),
  }
}

/**
 * The caveat to attach when a division's name spans the realignment. Returned to the model as
 * data rather than baked into the prompt, so it only appears when it's actually true.
 */
export function nchsaaRealignmentNote(classification: string | null | undefined, year: number): string | null {
  const c = classification?.trim()
  if (!c) return null
  // 1A/2A and 1-4A are already realignment-aware labels; the plain numbered divisions are not.
  if (!/^\d+A$/i.test(c)) return null
  return (
    `NCHSAA realigned in ${NCHSAA_REALIGNMENT_YEAR} (1A–4A became 1A/2A and 3A–8A), so "${c.toUpperCase()}" ` +
    `in ${year} is not the same field of schools as "${c.toUpperCase()}" ` +
    `${year >= NCHSAA_REALIGNMENT_YEAR ? `before ${NCHSAA_REALIGNMENT_YEAR}` : `from ${NCHSAA_REALIGNMENT_YEAR} on`}. ` +
    `Mention this only if the user compares divisions across ${NCHSAA_REALIGNMENT_YEAR}.`
  )
}

export async function getLatestFargoYear(): Promise<number | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("fargo_results")
    .select("year")
    .order("year", { ascending: false })
    .limit(1)
  if (error || !data?.length) return null
  const y = Number((data[0] as { year: unknown }).year)
  return Number.isFinite(y) ? y : null
}
