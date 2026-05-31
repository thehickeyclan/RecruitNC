/**
 * Single loader for NCHSAA + NHSCA + Super32. USE THIS for any new page that needs tournament data.
 * Delegates to `loadAthleteTournamentBundle` — same merge as profiles and college guide.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  loadAthleteTournamentBundle,
  useLegacyTournamentBundle,
  type AthleteTournamentBundle,
} from "@/lib/athlete-tournament-bundle"
import { getNCHSAAResultsForProfile } from "@/lib/nchsaa-results"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import {
  getNHSCAFromTables,
  getNHSCAFromTablesAllTime,
  getSuper32FromTable,
  getSuper32FromTableAllTime,
} from "@/lib/tournament-tables"

export type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"

export interface ProfileTournamentData {
  nchsaa: NchsaaRowForProfile[]
  nhsca: AthleteTournamentBundle["nhsca"]
  super32: AthleteTournamentBundle["super32"]
}

/** Athlete row minimal fields needed for loading profile tournament data */
export interface AthleteForProfile {
  id: string
  name: string | null
  highschool?: string | null
  graduationyear?: number | string | null
  weightclass?: string | null
  wrestling_name?: string | null
  nchsaa_results?: unknown
  nhsca_results?: unknown
  super32_results?: unknown
  high_school?: string | null
}

export interface LoadProfileTournamentDataOptions {
  /** If true, NHSCA tables use all years (e.g. Blue all-time tiles). */
  allTime?: boolean
}

function parseGradYearForProfile(athlete: AthleteForProfile): { grad: number; hasValid: boolean } {
  const raw = athlete.graduationyear
  if (raw == null || String(raw).trim() === "") return { grad: new Date().getFullYear(), hasValid: false }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1990 || n > 2050) return { grad: new Date().getFullYear(), hasValid: false }
  return { grad: Math.floor(n), hasValid: true }
}

/** Pre-bundle table-only path — restored when RECRUITNC_LEGACY_TOURNAMENT_BUNDLE=1. */
async function loadProfileTournamentDataLegacy(
  supabase: SupabaseClient,
  athlete: AthleteForProfile,
  options?: LoadProfileTournamentDataOptions,
): Promise<ProfileTournamentData> {
  const name = (athlete.name ?? "").toString().trim()
  const { grad, hasValid } = parseGradYearForProfile(athlete)
  const highSchool = (athlete.highschool ?? athlete.high_school ?? "").toString().trim()
  const allTime = options?.allTime === true

  const [nchsaa, nhsca, super32] = await Promise.all([
    allTime
      ? getNCHSAAResultsForProfile(supabase, name, undefined)
      : getNCHSAAResultsForProfile(supabase, name, hasValid ? grad : undefined, highSchool || undefined),
    allTime
      ? getNHSCAFromTablesAllTime(supabase, name, hasValid ? grad : undefined)
      : hasValid
        ? getNHSCAFromTables(supabase, name, grad)
        : Promise.resolve([]),
    allTime
      ? getSuper32FromTableAllTime(supabase, name, { highSchool: highSchool || undefined })
      : hasValid
        ? getSuper32FromTable(supabase, name, grad, { highSchool: highSchool || undefined })
        : Promise.resolve([]),
  ])

  return {
    nchsaa,
    nhsca: nhsca.map((r) => ({
      year: r.year,
      placement: (r.placement ?? "").toString(),
      record: (r.record ?? "").toString(),
      weight: r.weight,
      division: r.division,
    })),
    super32: super32.map((r) => ({
      year: r.year,
      placement: (r.placement ?? "").toString(),
      record: (r.record ?? "").toString(),
      weight: r.weight,
      division: r.division,
    })),
  }
}

export async function loadProfileTournamentData(
  supabase: SupabaseClient,
  athlete: AthleteForProfile,
  options?: LoadProfileTournamentDataOptions,
): Promise<ProfileTournamentData> {
  if (useLegacyTournamentBundle()) {
    return loadProfileTournamentDataLegacy(supabase, athlete, options)
  }
  return loadAthleteTournamentBundle(supabase, athlete as Record<string, unknown>, {
    nhscaAllTime: options?.allTime === true,
  })
}
