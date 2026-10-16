/**
 * The opponent index the profile's significant wins and notable losses are measured against.
 *
 * Lifted out of app/api/athletes/[id]/significant-wins/route.ts so the coach event report reads
 * exactly the same index the profile does - a win the profile does not credit must not appear in
 * an email, and the other way round. The route assembles it from these pieces unchanged.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { buildTocFieldBoard } from "@/lib/toc/field-board"
import { loadStatePlacerIndex } from "@/lib/state-placers"
import type { OpponentIndex, RankedOpponent } from "@/lib/significant-wins"

/** Names in the confirmed TOC field, from the raw toc_invitations rows. */
export function tocFieldNames(invitations: readonly unknown[] | null | undefined): string[] {
  return buildTocFieldBoard((invitations ?? []) as never)
    .weights.flatMap((weight) => weight.athletes.filter((a) => a.status === "confirmed").map((a) => a.name))
    .filter(Boolean)
}

/**
 * Every ranked athlete, published or not. Paginated: PostgREST caps a request at 1000 rows and
 * there are more ranked athletes than that across every class once the unpublished ones are
 * included.
 */
export async function loadRankedOpponents(admin: SupabaseClient): Promise<RankedOpponent[]> {
  const ranked: RankedOpponent[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("athletes")
      .select("name,prospect_ranking,graduationyear,gender")
      .not("prospect_ranking", "is", null)
      .range(from, from + 999)
    if (!data?.length) break
    for (const row of data) {
      if (row.name) {
        ranked.push({
          name: String(row.name),
          ranking: row.prospect_ranking == null ? null : Number(row.prospect_ranking),
          graduationYear: row.graduationyear == null ? null : Number(row.graduationyear),
          gender: (row.gender as string | null) ?? null,
        })
      }
    }
    if (data.length < 1000) break
  }
  return ranked
}

/** The out-of-state placer index the route reads, with the same empty fallback. */
export function loadOutOfStatePlacerIndex(admin: SupabaseClient) {
  return loadStatePlacerIndex(admin, new Date(), { outOfState: true }).catch(() => ({
    statePlacers: [],
    stateSchools: [],
    fargoAllAmericans: [],
  }))
}

/**
 * The whole index in one call, for both boards. Narrow it to one wrestler's board with
 * `rankedOnBoard(index, gender)` before use, as the route does.
 */
export async function loadSignificantOpponentIndex(admin: SupabaseClient): Promise<OpponentIndex> {
  const [{ data: invitations }, ranked, stateIndex] = await Promise.all([
    admin.from("toc_invitations").select("*, athletes(id,name)"),
    loadRankedOpponents(admin),
    loadOutOfStatePlacerIndex(admin),
  ])
  return { tocField: tocFieldNames(invitations), ranked, ...stateIndex }
}
