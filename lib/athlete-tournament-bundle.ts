/**
 * Single tournament merge for every surface that shows a kid's results.
 * Profiles, rankings, college guide, Data Dawg, Blue — all call this.
 *
 * Rollback: revert commits on branch `feat/tournament-bundle-consistency` or set
 * RECRUITNC_LEGACY_TOURNAMENT_BUNDLE=1 to use pre-bundle table-only paths in loadProfileTournamentData.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getMergedNchsaaForAthlete } from "@/lib/nchsaa-results"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import {
  getNHSCAForAthlete,
  getSuper32ForAthlete,
  getFargoForAthlete,
  type TournamentResultForDisplay,
} from "@/lib/public-profile-data"
import { loadLinkedSourceRows, resultLinksEnabled } from "@/lib/identity/linked-results"
import {
  getOtherTournamentResultsForAthleteRecord,
  type OtherTournamentResult,
} from "@/lib/other-tournaments"

export type AthleteTournamentBundle = {
  nchsaa: NchsaaRowForProfile[]
  nhsca: TournamentResultForDisplay[]
  super32: TournamentResultForDisplay[]
  fargo: TournamentResultForDisplay[]
  /** Qualifiers and open events — Super 32 Early Entry and the like, not Super 32 itself. */
  other: OtherTournamentResult[]
}

export type LoadAthleteTournamentBundleOptions = {
  /** NHSCA placement tables across all years (Blue all-time tiles, dossiers). */
  nhscaAllTime?: boolean
  /** Override RESULT_LINKS_READ for this call (the step-2 comparison runs both ways). */
  linkedRead?: boolean
}

export function useLegacyTournamentBundle(): boolean {
  return process.env.RECRUITNC_LEGACY_TOURNAMENT_BUNDLE === "1"
}

/** Full athlete row (`select("*")` or equivalent) for JSON merges on NCHSAA/NHSCA/Super32. */
export async function loadAthleteTournamentBundle(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
  options?: LoadAthleteTournamentBundleOptions,
): Promise<AthleteTournamentBundle> {
  // Wrestler identity, step 2: read stored links when switched on. null means fall back to names.
  // Started, not awaited: the NHSCA roster and other-event searches do not need it and run alongside.
  const useLinks = options?.linkedRead ?? resultLinksEnabled()
  const linked = useLinks && athlete.id ? loadLinkedSourceRows(supabase, String(athlete.id)) : Promise.resolve(null)
  const [nchsaa, nhsca, super32, fargo, other] = await Promise.all([
    linked.then((l) => getMergedNchsaaForAthlete(supabase, athlete, l)),
    getNHSCAForAthlete(supabase, athlete, { tablesAllTime: options?.nhscaAllTime === true, linked }),
    linked.then((l) => getSuper32ForAthlete(supabase, athlete, l)),
    linked.then((l) => getFargoForAthlete(supabase, athlete, l)),
    getOtherTournamentResultsForAthleteRecord(supabase, athlete),
  ])
  return { nchsaa, nhsca, super32, fargo, other }
}
