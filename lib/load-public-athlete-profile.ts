import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { resolveGraduationYear } from "@/lib/athlete-nhsca"
import { getAauScholasticDuals2026ProfileResults, getAauScholasticDuals2026ProfileQualityWins } from "@/lib/aau-scholastic-duals-2026-profile"
import type { AauScholasticWrestlerQualityWins } from "@/lib/aau-scholastic-duals-2026-quality-wins"
import {
  getNhscaDuals2026LiveProfileResults,
  getNhscaDuals2026RegistrationPlaceholders,
  mergeNationalTeamResultsForProfile,
} from "@/lib/national-team-live-profile-results"
import { getNationalTeamProfileHighlights } from "@/lib/national-team-profile-highlights"
import type { ProfileNationalTeamHighlight } from "@/lib/national-team-profile-highlights"
import { getUltimateClubDualsFromTables } from "@/lib/tournament-tables"
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
  national_team_results: unknown[]
  national_team_highlight_videos: ProfileNationalTeamHighlight[]
  aau_scholastic_quality_wins: AauScholasticWrestlerQualityWins | null
}

export type LoadPublicAthleteProfileResult =
  | { ok: true; athlete: PublicAthleteProfile }
  | { ok: false; error: string; code?: string }

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

  const gradYear = resolveGraduationYear(athlete as Record<string, unknown>)
  const highSchool = (athlete.highschool ?? athlete.highSchool ?? "").toString().trim()
  const name = (athlete.name ?? "").toString().trim()
  const wrestlingName = (athlete.wrestling_name ?? "").toString().trim()
  const nameBases: string[] = []
  if (name) nameBases.push(name)
  if (wrestlingName && wrestlingName.toLowerCase() !== name.toLowerCase()) nameBases.push(wrestlingName)

  const athleteRow = athlete as Record<string, unknown>
  const [bundle, nationalTeamFromTables, nhscaDualsLive, nhscaDualsRegistration] = await Promise.all([
    loadAthleteTournamentBundle(client, athleteRow),
    (async () => {
      const bases = nameBases.filter(Boolean)
      if (!bases.length) return []
      const tries = await Promise.all(
        bases.map((n) => getUltimateClubDualsFromTables(client, n, highSchool || undefined)),
      )
      for (const rows of tries) {
        if (rows.length) return rows
      }
      return []
    })(),
    getNhscaDuals2026LiveProfileResults(client, nameBases),
    getNhscaDuals2026RegistrationPlaceholders(client, trimmed, {
      name,
      highSchool,
      gradYear,
    }),
  ])

  const { nchsaa: nchsaaMergedRows, nhsca: nhscaMerged, super32: super32Merged } = bundle
  const nchsaa_profile = nchsaaMergedRows.map((r) => ({
    year: r.year,
    place: r.place,
    classification: r.classification,
    weight_class: r.weight_class,
  }))
  const nationalTeamFromRow = getNationalTeamResults(athlete)
  const aauScholasticResults = getAauScholasticDuals2026ProfileResults(trimmed, nameBases)
  const aau_scholastic_quality_wins = getAauScholasticDuals2026ProfileQualityWins(trimmed, nameBases)
  const national_team_results = mergeNationalTeamResultsForProfile({
    fromTable: nationalTeamFromTables,
    fromAthleteRow: nationalTeamFromRow,
    fromLive: nhscaDualsLive,
    fromRegistration: nhscaDualsRegistration,
    fromAau: aauScholasticResults,
  })
  const national_team_highlight_videos = getNationalTeamProfileHighlights(trimmed, nameBases)

  return {
    ok: true,
    athlete: {
      ...(athlete as Record<string, unknown>),
      nhsca_results: nhscaMerged,
      nchsaa_profile,
      super32_results: super32Merged,
      national_team_results,
      national_team_highlight_videos,
      aau_scholastic_quality_wins,
    },
  }
}
