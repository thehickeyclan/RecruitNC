import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Where a girl sits on the national lists, read live from `national_rankings`.
 *
 * One reader for the women's board (which scores it) and the women's class pages (which print
 * it), so the pill a coach sees and the points the formula gave can never disagree. Nothing is
 * copied anywhere: a new edition from the SI cron or Muse's ingest is what both read next.
 *
 * Newest edition of each list only. A row reaches a girl by its own athlete_id or by a stored
 * identity link: Nevaeh Williamson's SI #11 carries only the link (SI printed her state as SC).
 */

export type WomensNationalRankRow = {
  source: string
  scope: string
  rank: number
  /** "SI #16 at 125" */
  label: string
  /** YYYY-MM-DD of the edition. */
  month: string
}

const NATIONAL_SOURCE_SHORT: Record<string, string> = {
  sports_illustrated: "SI",
  matscouts: "MatScouts",
  flowrestling: "Flo",
}

export async function loadWomensNationalRanks(
  supabase: SupabaseClient,
  athleteIds: ReadonlyArray<string>,
): Promise<Map<string, WomensNationalRankRow[]>> {
  const out = new Map<string, WomensNationalRankRow[]>()
  if (!athleteIds.length) return out

  const rows: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("national_rankings")
      .select("id, source, scope, rank, weight_class, ranking_month, edition_class_year, athlete_id")
      .eq("gender", "F")
      .range(from, from + 999)
    if (error || !data) break
    rows.push(...(data as Array<Record<string, unknown>>))
    if (data.length < 1000) break
  }
  const editionKey = (r: Record<string, unknown>) => `${r.source}|${r.scope}|${r.edition_class_year ?? 0}`
  const newest = new Map<string, string>()
  for (const r of rows) {
    const k = editionKey(r)
    if (!newest.has(k) || String(r.ranking_month) > newest.get(k)!) newest.set(k, String(r.ranking_month))
  }
  const current = rows.filter((r) => newest.get(editionKey(r)) === String(r.ranking_month))
  const linked = new Map<string, string>()
  const unlinkedIds = current.filter((r) => !r.athlete_id).map((r) => String(r.id))
  for (let i = 0; i < unlinkedIds.length; i += 200) {
    const { data } = await supabase
      .from("result_athlete_links")
      .select("source_id, athlete_id, status")
      .eq("source_table", "national_rankings")
      .in("source_id", unlinkedIds.slice(i, i + 200))
    for (const l of data ?? []) {
      if (l.athlete_id && l.status !== "rejected") linked.set(String(l.source_id), String(l.athlete_id))
    }
  }
  const wanted = new Set(athleteIds)
  for (const r of current) {
    const athleteId = r.athlete_id ? String(r.athlete_id) : linked.get(String(r.id))
    if (!athleteId || !wanted.has(athleteId)) continue
    const source = String(r.source)
    const scope = String(r.scope)
    const rank = Number(r.rank)
    if (!Number.isFinite(rank)) continue
    const outlet = NATIONAL_SOURCE_SHORT[source] ?? source
    const label =
      scope === "p4p"
        ? `${outlet} #${rank} pound-for-pound`
        : scope === "big_board"
          ? `${outlet} #${rank} Class of ${r.edition_class_year} board`
          : `${outlet} #${rank} at ${r.weight_class}`
    out.set(athleteId, [...(out.get(athleteId) ?? []), { source, scope, rank, label, month: String(r.ranking_month) }])
  }
  return out
}
