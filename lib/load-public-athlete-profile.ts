import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { resolveGraduationYear } from "@/lib/athlete-nhsca"
import { getAauScholasticDuals2026ProfileResults } from "@/lib/aau-scholastic-duals-2026-profile"
import { getProfileQualityWins, type ProfileQualityWinsTournamentBlock } from "@/lib/profile-quality-wins"
import {
  getNhscaDuals2026LiveProfileResults,
  getNhscaDuals2026RegistrationPlaceholders,
  mergeNationalTeamResultsForProfile,
} from "@/lib/national-team-live-profile-results"
import { getNationalTeamProfileHighlights } from "@/lib/national-team-profile-highlights"
import type { ProfileNationalTeamHighlight } from "@/lib/national-team-profile-highlights"
import {
  buildProfileWeightDisplay,
  candidatesFromPublicProfilePayload,
  resolveLastCompetedWeight,
  type ProfileWeightDisplay,
} from "@/lib/last-competed-weight"
import { getUltimateClubDualsFromTables } from "@/lib/tournament-tables"
import {
  getOtherTournamentProfileBlocks,
  type OtherTournamentProfileBlock,
} from "@/lib/other-tournaments"
import { getNationalTeamResults } from "@/lib/tournament-utils"

export type PublicAthleteProfile = Record<string, unknown> & {
  nhsca_results: unknown[]
  nchsaa_profile: Array<{
    year: number
    place: number | null
    classification: string
    weight_class: string
  }>
  super32_results: unknown[]
  fargo_results: unknown[]
  /** Qualifiers and open events (Super 32 Early Entry etc.) with strength-of-wins attached. */
  other_tournament_blocks: OtherTournamentProfileBlock[]
  national_team_results: unknown[]
  national_team_highlight_videos: ProfileNationalTeamHighlight[]
  profile_quality_wins: ProfileQualityWinsTournamentBlock[]
  /** Display-only: last tournament weight vs profile-listed weight. */
  profile_weight_display: ProfileWeightDisplay
}

export type LoadPublicAthleteProfileResult =
  | { ok: true; athlete: PublicAthleteProfile }
  | { ok: false; error: string; code?: string }

/**
 * Canonical NC United team and documented quality-win lookup for an existing athlete row.
 * Keep this shared: rankings must not infer team membership from a single table or a stale
 * profile column while the public profile merges registrations, live results, and archives.
 */
export async function loadPublicAthleteNationalTeamData(
  client: SupabaseClient,
  athleteRow: Record<string, unknown>,
): Promise<{
  nationalTeamResults: unknown[]
  qualityWins: ProfileQualityWinsTournamentBlock[]
}> {
  const athleteId = String(athleteRow.id ?? "").trim()
  const gradYear = resolveGraduationYear(athleteRow)
  const highSchool = String(athleteRow.highschool ?? athleteRow.highSchool ?? "").trim()
  const name = String(athleteRow.name ?? "").trim()
  const wrestlingName = String(athleteRow.wrestling_name ?? "").trim()
  const nameBases = [name, wrestlingName].filter(
    (value, index, values) => Boolean(value) && values.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index,
  )

  const [nationalTeamFromTables, nhscaDualsLive, nhscaDualsRegistration] = await Promise.all([
    (async () => {
      for (const base of nameBases) {
        const rows = await getUltimateClubDualsFromTables(client, base, highSchool || undefined)
        if (rows.length) return rows
      }
      return []
    })(),
    getNhscaDuals2026LiveProfileResults(client, nameBases),
    getNhscaDuals2026RegistrationPlaceholders(client, athleteId, { name, highSchool, gradYear }),
  ])

  return {
    nationalTeamResults: mergeNationalTeamResultsForProfile({
      fromTable: nationalTeamFromTables,
      fromAthleteRow: getNationalTeamResults(athleteRow),
      fromLive: nhscaDualsLive,
      fromRegistration: nhscaDualsRegistration,
      fromAau: getAauScholasticDuals2026ProfileResults(athleteId, nameBases),
    }),
    qualityWins: getProfileQualityWins(athleteId, nameBases),
  }
}

/** Load one public athlete with tournament bundle merged (shared by API route + view-profile SSR). */
export async function loadPublicAthleteProfile(
  id: string,
  supabase?: SupabaseClient,
): Promise<LoadPublicAthleteProfileResult> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return { ok: false, error: "missing id" }
  }

  const client = supabase ?? createAdminClient()
  const { data: athlete, error } = await client.from("athletes").select("*").eq("id", trimmed).single()

  if (error) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (!athlete) {
    return { ok: false, error: "no row" }
  }

  const name = (athlete.name ?? "").toString().trim()
  const wrestlingName = (athlete.wrestling_name ?? "").toString().trim()
  const nameBases: string[] = []
  if (name) nameBases.push(name)
  if (wrestlingName && wrestlingName.toLowerCase() !== name.toLowerCase()) nameBases.push(wrestlingName)

  const athleteRow = athlete as Record<string, unknown>
  const [bundle, nationalTeamData, otherTournamentBlocks] = await Promise.all([
    loadAthleteTournamentBundle(client, athleteRow),
    loadPublicAthleteNationalTeamData(client, athleteRow),
    getOtherTournamentProfileBlocks(client, athleteRow),
  ])

  const { nchsaa: nchsaaMergedRows, nhsca: nhscaMerged, super32: super32Merged, fargo: fargoMerged } = bundle
  const nchsaa_profile = nchsaaMergedRows.map((r) => ({
    year: r.year,
    place: r.place,
    classification: r.classification,
    weight_class: r.weight_class,
  }))
  const profile_quality_wins = nationalTeamData.qualityWins
  const national_team_results = nationalTeamData.nationalTeamResults
  const national_team_highlight_videos = getNationalTeamProfileHighlights(trimmed, nameBases)

  const profilePayload = {
    nchsaa_profile,
    nhsca_results: nhscaMerged,
    super32_results: super32Merged,
    fargo_results: fargoMerged,
    national_team_results,
    other_tournament_results: otherTournamentBlocks.map((block) => block.result),
  }
  const lastCompeted = resolveLastCompetedWeight(candidatesFromPublicProfilePayload(profilePayload))
  const listedWeight = (athlete as Record<string, unknown>).weightclass ?? (athlete as Record<string, unknown>).weight_class
  const profile_weight_display = buildProfileWeightDisplay(listedWeight as string | number | null, lastCompeted)

  return {
    ok: true,
    athlete: {
      ...(athlete as Record<string, unknown>),
      nhsca_results: nhscaMerged,
      nchsaa_profile,
      super32_results: super32Merged,
      fargo_results: fargoMerged,
      other_tournament_blocks: otherTournamentBlocks,
      national_team_results,
      national_team_highlight_videos,
      profile_quality_wins,
      profile_weight_display,
    },
  }
}
