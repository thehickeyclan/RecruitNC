import { createAdminClient } from "@/lib/supabase/admin"
import { findSimilarNames } from "@/lib/athlete-fuzzy-search"

/**
 * "Did you mean…" for a wrestler whose name was typed wrong.
 *
 * The last resort when every other search is empty. Over a fortnight a fifth of Data Dawg's
 * answers were "I couldn't find any records", and the wrestlers were usually on file: someone
 * asked for "Deion marshals" and was told Deion Marshall does not exist, and "Heaven Finch" missed
 * Heaven Fitch, who has three state titles.
 *
 * The existing search already tries a four-character prefix, which rescues a directory row. It
 * cannot rescue an alumnus who has no directory row at all and lives only in historical results,
 * where matching is stricter — which is exactly who these two were.
 */

const CACHE_MS = 10 * 60 * 1000
let cache: { names: string[]; at: number } | null = null

async function pageAll(table: string, column: string): Promise<string[]> {
  const admin = createAdminClient()
  const out: string[] = []
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await admin.from(table).select(column).range(from, from + 999)
    if (error || !data?.length) break
    out.push(...data.map((r) => String((r as unknown as Record<string, unknown>)[column] ?? "")))
    if (data.length < 1000) break
  }
  return out
}

/**
 * Every name worth suggesting, from the directory and the historical record alike.
 *
 * Cached for ten minutes: the list runs to several thousand names and changes rarely, while the
 * cost of rebuilding it inside a chat turn is several round trips a user would feel.
 */
export async function searchableAthleteNames(): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.names

  const [directory, state, nhsca] = await Promise.all([
    pageAll("athletes", "name"),
    pageAll("wrestling_nchsaa_results", "wrestler_name"),
    pageAll("nhsca_placements", "wrestler_name"),
  ])

  const names = [...new Set([...directory, ...state, ...nhsca].map((n) => n.trim()).filter((n) => n.length > 2))]
  cache = { names, at: Date.now() }
  return names
}

export type NameSuggestion = { name: string; score: number }

/** Nothing when the wrestler genuinely is not on file — a confident wrong name is worse than none. */
export async function suggestAthleteNames(query: string, limit = 4): Promise<NameSuggestion[]> {
  const names = await searchableAthleteNames()
  return findSimilarNames(query, names, (n) => n, { limit }).map(({ name, score }) => ({
    name,
    score: Number(score.toFixed(3)),
  }))
}
