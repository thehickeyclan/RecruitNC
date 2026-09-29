/**
 * Bout-level NHSCA High School Nationals results, for the profile.
 *
 * NHSCA was held as a record and a placement and nothing else. A profile could say a wrestler
 * went 7-2 and placed fourth without naming a single person they beat, which is the one thing a
 * college coach reading it wants. States has shown every bout since the 2026 import; this brings
 * NHSCA level with it.
 *
 * North Carolina wrestlers only, and the boys' high school bracket only — see
 * `scripts/import-nhsca-nationals-bouts.ts`, which is where that filtering happens and where it
 * belongs. Nothing here assumes a particular year: each imported edition writes its own
 * `nhsca-nationals-<year>` key and is picked up by the prefix.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

export type NhscaNationalBout = {
  year: number
  date: string | null
  weight: string | null
  round: string | null
  opponent: string
  /** The state an opponent wrestled for — NHSCA and Super 32 list a state, not a school. */
  opponentState: string | null
  outcome: "W" | "L"
  method: string | null
  score: string | null
}

export const NHSCA_NATIONAL_BOUT_PREFIX = "nhsca-nationals-"

/**
 * Super 32's keys, `super32-<year>`, and nothing else. A bare `super32-` prefix would also take
 * `super32-early-entry-nc-2026` — a different tournament, whose bouts belong on its own row.
 * Four underscores match a year exactly.
 */
export const SUPER32_BOUT_KEY_PATTERN = "super32-____"

export function getNhscaNationalBoutsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<NhscaNationalBout[]> {
  return getEventBoutsForAthlete(supabase, athleteId, `${NHSCA_NATIONAL_BOUT_PREFIX}%`)
}

/** Super 32 bouts, imported by `scripts/import-super32-bouts.ts` on the same terms as NHSCA. */
export function getSuper32BoutsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<NhscaNationalBout[]> {
  return getEventBoutsForAthlete(supabase, athleteId, SUPER32_BOUT_KEY_PATTERN)
}

async function getEventBoutsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
  eventKeyPattern: string,
): Promise<NhscaNationalBout[]> {
  if (!athleteId.trim()) return []
  try {
    const { data, error } = await supabase
      .from("other_tournament_bouts")
      .select("year,event_date,weight_class,round,bout_order,opponent_name,opponent_club,win,win_type,score")
      .eq("athlete_id", athleteId)
      .like("event_key", eventKeyPattern)
      .order("year", { ascending: false })
      // Bracket order as the export recorded it. See the importer for why this is not derived
      // from the round label.
      .order("bout_order", { ascending: true })
    if (error || !data?.length) return []
    return data.flatMap((row): NhscaNationalBout[] => {
      const opponent = String(row.opponent_name ?? "").trim()
      const year = Number(row.year)
      if (!opponent || !Number.isFinite(year)) return []
      return [{
        year,
        date: String(row.event_date ?? "").trim() || null,
        weight: String(row.weight_class ?? "").trim() || null,
        round: String(row.round ?? "").trim() || null,
        opponent,
        opponentState: String(row.opponent_club ?? "").trim() || null,
        outcome: row.win ? "W" : "L",
        method: String(row.win_type ?? "").trim() || null,
        score: String(row.score ?? "").trim() || null,
      }]
    })
  } catch {
    return []
  }
}

