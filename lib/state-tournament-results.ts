/**
 * A wrestler's own state tournament placements, for a state that is not North Carolina.
 *
 * North Carolina's live in `wrestling_nchsaa_results` and reach a profile through
 * `getMergedNchsaaForAthlete`. Every other state's live in `state_tournament_placers` — 49 states,
 * three seasons — and until now nothing read that table on behalf of the wrestler it describes. It
 * was only ever read the other way round, to label the OPPONENTS on an NC wrestler's bouts
 * (lib/state-placers.ts). So South Carolina's 966 placements for 2026 reached nobody: minting SC
 * profiles before this existed would have produced 280 pages with no results on them.
 *
 * Matched on `athlete_id`, the column the minter writes, exactly as `wrestling_nchsaa_results`
 * does for North Carolina — never on the name alone. Namesakes stop being rare at national scale
 * (133 placer names already repeat across states), and a wrong placement on a recruiting profile
 * is worse than a missing one.
 *
 * Do not reach for `source_athlete_id` here: that holds a FloArena id, from the source the rows
 * were scraped from, and `athlete_identities` carries null for it — the two cannot be joined.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import { HOME_STATE, normalizeState } from "@/lib/athlete-state"

/** One row of `state_tournament_placers`, in the columns a profile needs. */
type PlacerRow = {
  season: number | string | null
  state: string | null
  classification: string | null
  association: string | null
  weight: string | number | null
  place: number | null
  wrestler_name: string | null
  school_clean: string | null
  school_raw: string | null
}

/**
 * Placements for one athlete, in the same shape the NCHSAA path produces, so every surface that
 * already renders state results renders these without knowing which table they came from.
 *
 * Returns nothing for a North Carolina wrestler: his placements come from the NCHSAA table, and
 * reading both would print each one twice.
 */
export async function getStateTournamentResultsForAthlete(
  client: SupabaseClient,
  athlete: { id?: unknown; state?: unknown },
): Promise<NchsaaRowForProfile[]> {
  const state = normalizeState(String(athlete.state ?? "") || undefined)
  const id = String(athlete.id ?? "").trim()
  if (!id || state === HOME_STATE) return []

  const { data, error } = await client
    .from("state_tournament_placers")
    .select("season, state, classification, association, weight, place, wrestler_name, school_clean, school_raw")
    .eq("athlete_id", id)
    .eq("state", state)
  if (error || !data) return []

  return (data as PlacerRow[])
    .map((r) => ({
      year: Number(r.season) || 0,
      classification: String(r.classification ?? "").trim(),
      weight_class: String(r.weight ?? "").trim(),
      /* 0 and null both mean "reached the tournament, did not place" — the NCHSAA path's "State Qualifier". */
      place: r.place == null ? null : Number(r.place),
      school: String(r.school_clean ?? r.school_raw ?? "").trim(),
      wrestler_name: String(r.wrestler_name ?? "").trim(),
      association: String(r.association ?? "").trim().toUpperCase() || null,
    }))
    .filter((r) => r.year > 0)
    .sort((a, b) => b.year - a.year || (a.place ?? 99) - (b.place ?? 99))
}
