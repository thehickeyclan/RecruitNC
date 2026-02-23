/**
 * Single loader for NCHSAA + NHSCA + Super32. USE THIS for any new page that needs tournament data.
 * See docs/TOURNAMENT-DATA-SINGLE-PATH.md — do not wire new features to getNHSCAFromTables / getSuper32FromTable / getNCHSAAResultsForProfile directly.
 * Used by: Blue members 2026. Same data as profiles, rankings, commit cards; one entry point keeps new pages from re-discovering options and aggregation.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getNCHSAAResultsForProfile } from "@/lib/nchsaa-results"
import {
  getNHSCAFromTables,
  getNHSCAFromTablesAllTime,
  getSuper32FromTable,
  getSuper32FromTableAllTime,
} from "@/lib/tournament-tables"

export type NchsaaRowForProfile = Awaited<ReturnType<typeof getNCHSAAResultsForProfile>>[number]

export interface ProfileTournamentData {
  nchsaa: NchsaaRowForProfile[]
  nhsca: Awaited<ReturnType<typeof getNHSCAFromTables>>
  super32: Awaited<ReturnType<typeof getSuper32FromTable>>
}

/** Athlete row minimal fields needed for loading profile tournament data */
export interface AthleteForProfile {
  id: string
  name: string | null
  highschool?: string | null
  graduationyear?: number | string | null
  weightclass?: string | null
}

export interface LoadProfileTournamentDataOptions {
  /** If true, NHSCA and Super32 use all years (2000–2035); use for Blue page all-time tiles. */
  allTime?: boolean
}

/**
 * Load NCHSAA, NHSCA, and Super32 for one athlete.
 * allTime: true = NHSCA/Super32 over all years; false = grad-year window (unified profile default).
 */
export async function loadProfileTournamentData(
  supabase: SupabaseClient,
  athlete: AthleteForProfile,
  options?: LoadProfileTournamentDataOptions
): Promise<ProfileTournamentData> {
  const name = (athlete.name ?? "").toString().trim()
  const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
  const highSchool = (athlete.highschool ?? "").toString().trim()
  const allTime = options?.allTime === true

  const [nchsaa, nhsca, super32] = await Promise.all([
    getNCHSAAResultsForProfile(supabase, name),
    allTime
      ? getNHSCAFromTablesAllTime(supabase, name)
      : getNHSCAFromTables(supabase, name, gradYear),
    allTime
      ? getSuper32FromTableAllTime(supabase, name, { highSchool: highSchool || undefined })
      : getSuper32FromTable(supabase, name, gradYear, { highSchool: highSchool || undefined }),
  ])

  return { nchsaa, nhsca, super32 }
}
