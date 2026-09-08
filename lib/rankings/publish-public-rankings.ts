/**
 * Copy a published order into `public_rankings`, the table the iPhone app reads.
 *
 * The web and the app were never fed by the same publish. The ranking board wrote
 * `athletes.prospect_ranking`; the app reads `public_rankings`, a separate table filled by a
 * different endpoint behind a different button. Nothing reconciled them and nothing said so, so
 * the app sat three weeks behind the web with seven of the 2027 top twenty in the wrong order.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { buildRecruitNcRankingBoard } from "@/lib/rankings/recruitnc-ranking-engine"

export type PublicRankingsSyncResult = {
  synced: boolean
  rows: number
  /** Why nothing was written, when nothing was. Surfaced to the admin rather than logged away. */
  note?: string
}

/**
 * RecruitNC publishes boys' rankings only; there is no plan to publish girls'.
 *
 * Kept as a guard rather than deleted, because the cost of being wrong is asymmetric. The app
 * filters on gender now, but installs already on phones do not, and a girls' row written into
 * `public_rankings` would appear inside the boys' list on every one of them. If that decision
 * ever changes, this flips only once the older builds have drained.
 */
const APP_PUBLISHES_GIRLS = false


type BoardLike = {
  name?: string | null
  highschool?: string | null
  weightclass?: string | number | null
  state_placements?: string[]
  nhsca_record?: string | null
  super32_record?: string | null
  significant_wins?: unknown[]
}

/** The row shape `public_rankings` holds, built from the scored board plus the athlete row. */
export function buildPublicRankingRows({
  publicRows,
  boardById,
  athleteById,
  year,
  gender,
  publishedAt,
}: {
  publicRows: Array<{ athlete_id: string; rank: number }>
  boardById: Map<string, BoardLike>
  athleteById: Map<string, Record<string, unknown>>
  year: number
  gender: string
  publishedAt: string
}) {
  return publicRows.map((row) => {
    const scored = boardById.get(row.athlete_id)
    const athlete = athleteById.get(row.athlete_id)
    return {
      prospect_id: row.athlete_id,
      name: String(scored?.name ?? athlete?.name ?? "").trim(),
      high_school: (scored?.highschool ?? (athlete?.highschool as string) ?? null) || null,
      weight_class:
        scored?.weightclass != null
          ? String(scored.weightclass)
          : athlete?.weightclass != null
            ? String(athlete.weightclass)
            : null,
      state_result: scored?.state_placements?.[0] ?? null,
      nhsca_record: scored?.nhsca_record ?? null,
      super32_record: scored?.super32_record ?? null,
      // The app prints this as a plain string, not a boolean.
      ranked_win: scored?.significant_wins?.length ? "Yes" : "No",
      academic_gpa: typeof athlete?.academic_gpa === "number" ? athlete.academic_gpa : null,
      graduation_year: year,
      // Stored lowercase throughout this table; matching it keeps one class from splitting in two.
      gender: gender.toLowerCase(),
      prospect_ranking: row.rank,
      is_published: true,
      published_at: publishedAt,
    }
  })
}

export async function syncPublicRankingsTable({
  admin,
  year,
  gender,
  cap,
  publishedAt,
  draft,
}: {
  admin: SupabaseClient
  year: number
  gender: string
  cap: number
  publishedAt: string
  draft: Array<{ athlete_id: string; rank: number }>
}): Promise<PublicRankingsSyncResult> {
  const isMale = gender.toLowerCase() === "male"
  if (!APP_PUBLISHES_GIRLS && !isMale) {
    return {
      synced: false,
      rows: 0,
      note: "Published to the web only — the app carries the boys' rankings.",
    }
  }

  // Only the public cut. The table held 83 rows for a class that publishes 32 — the app hid the
  // surplus by capping on read, which left the private watchlist sitting in a table whose RLS
  // policy allows public read. What is not published should not be there at all.
  const publicRows = draft
    .filter((row) => Number.isInteger(row.rank) && row.rank >= 1 && row.rank <= cap)
    .sort((a, b) => a.rank - b.rank)
  if (!publicRows.length) return { synced: false, rows: 0, note: "Nothing inside the public cut to publish." }

  // The card fields the app shows — state result, NHSCA and Super 32 records — are computed by
  // the ranking engine rather than stored on the athlete, so the class is rebuilt to fill them.
  const board = await buildRecruitNcRankingBoard({ supabase: admin, year: String(year), gender }).catch(
    () => [] as Awaited<ReturnType<typeof buildRecruitNcRankingBoard>>,
  )
  const boardById = new Map(board.map((athlete) => [String(athlete.id), athlete]))

  const ids = publicRows.map((row) => row.athlete_id)
  const { data: athleteRows } = await admin.from("athletes").select("id, name, highschool, weightclass, academic_gpa").in("id", ids)
  const athleteById = new Map((athleteRows ?? []).map((row) => [String((row as { id: unknown }).id), row as Record<string, unknown>]))

  const rows = buildPublicRankingRows({ publicRows, boardById, athleteById, year, gender, publishedAt })

  // Replace this class wholesale. A wrestler who drops out of the top thirty must leave the app,
  // not linger in it at their old number.
  const { error: clearError } = await admin
    .from("public_rankings")
    .delete()
    .eq("graduation_year", year)
    .ilike("gender", gender)
  if (clearError) return { synced: false, rows: 0, note: `Could not clear the previous app rankings: ${clearError.message}` }

  const { error } = await admin.from("public_rankings").insert(rows)
  if (error) return { synced: false, rows: 0, note: `Could not write the app rankings: ${error.message}` }

  return { synced: true, rows: rows.length }
}
