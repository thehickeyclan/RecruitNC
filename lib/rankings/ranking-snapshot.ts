import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * A board's published order, as its own snapshot (scripts/create-ranking-published.sql).
 *
 * South Carolina cannot publish into `athletes.prospect_ranking`: that column is read as North
 * Carolina's by profiles, the app, the home page and the ranked-opponent index. So every state's
 * published order is kept here, and it is also what tells the page who moved since the last
 * edition and who is new to it (Matt, 29 October 2026).
 */
export type SnapshotRow = { athlete_id: string; rank: number; previous_rank: number | null; is_new: boolean }

/**
 * The next edition, measured against the one it replaces.
 *
 * `prior` is null when there is no earlier edition anyone saw: then nobody is marked new and
 * nobody has moved, because there is nothing to have moved from.
 */
export function diffAgainstPrior(
  next: ReadonlyArray<{ athlete_id: string; rank: number }>,
  prior: ReadonlyMap<string, number> | null,
): SnapshotRow[] {
  return [...next]
    .sort((a, b) => a.rank - b.rank)
    .map((row) => ({
      athlete_id: row.athlete_id,
      rank: row.rank,
      previous_rank: prior?.get(row.athlete_id) ?? null,
      is_new: prior != null && prior.size > 0 && !prior.has(row.athlete_id),
    }))
}

/** The published edition of one board, or null when it has none (or the table is not there yet). */
export async function loadPublishedSnapshot(
  admin: SupabaseClient,
  state: string,
  year: number,
  gender: string,
): Promise<SnapshotRow[] | null> {
  const { data, error } = await admin
    .from("ranking_published")
    .select("athlete_id, rank, previous_rank, is_new")
    .eq("state", state)
    .eq("class_year", year)
    .eq("gender", gender)
    .order("rank", { ascending: true })
  if (error || !data?.length) return null
  return data.map((row) => ({
    athlete_id: String(row.athlete_id),
    rank: Number(row.rank),
    previous_rank: row.previous_rank == null ? null : Number(row.previous_rank),
    is_new: row.is_new === true,
  }))
}

/**
 * Replace a board's published edition. `fallbackPrior` stands in for the replaced edition when
 * this table has none yet - North Carolina's current public order, read before it is overwritten.
 */
export async function writePublishedSnapshot({
  admin,
  state,
  year,
  gender,
  rows,
  publishedAt,
  fallbackPrior = null,
}: {
  admin: SupabaseClient
  state: string
  year: number
  gender: string
  rows: ReadonlyArray<{ athlete_id: string; rank: number }>
  publishedAt: string
  fallbackPrior?: ReadonlyMap<string, number> | null
}): Promise<{ ok: true; rows: SnapshotRow[] } | { ok: false; error: string }> {
  const existing = await loadPublishedSnapshot(admin, state, year, gender)
  const prior = existing ? new Map(existing.map((r) => [r.athlete_id, r.rank])) : fallbackPrior
  const next = diffAgainstPrior(rows, prior)

  const { error: clearError } = await admin
    .from("ranking_published")
    .delete()
    .eq("state", state)
    .eq("class_year", year)
    .eq("gender", gender)
  if (clearError) return { ok: false, error: clearError.message }
  if (next.length) {
    const { error } = await admin
      .from("ranking_published")
      .insert(next.map((row) => ({ ...row, state, class_year: year, gender, published_at: publishedAt })))
    if (error) return { ok: false, error: error.message }
  }
  return { ok: true, rows: next }
}
