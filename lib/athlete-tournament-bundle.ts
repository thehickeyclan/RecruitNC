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
import {
  getOtherTournamentResultsForAthlete,
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
  const [nchsaa, nhsca, super32, fargo, other] = await Promise.all([
    getMergedNchsaaForAthlete(supabase, athlete),
    getNHSCAForAthlete(supabase, athlete, { tablesAllTime: options?.nhscaAllTime === true }),
    getSuper32ForAthlete(supabase, athlete),
    getFargoForAthlete(supabase, athlete),
    getOtherTournamentResultsForAthlete(supabase, String(athlete.id ?? "")),
  ])
  return { nchsaa, nhsca, super32, fargo, other }
}
