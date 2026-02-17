import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { buildPublicProfileTournamentData } from "@/lib/public-profile-data"
import { getNationalTeamResults, mergeNationalTeamResults } from "@/lib/tournament-utils"
import { getNHSCAFromTables, getSuper32FromTable, getUltimateClubDualsFromTables } from "@/lib/tournament-tables"

const rawPublicIds = (process.env.PUBLIC_PROFILE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)

const PUBLIC_PROFILE_IDS = new Set(rawPublicIds)

interface UnifiedProfilePageProps {
  params: {
    id: string
  }
}

async function getAthlete(id: string, supabase: SupabaseClient) {
  const { data: athlete, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !athlete) {
    console.log("[v0] Athlete not found or error:", error)
    return null
  }

  return athlete
}

async function getNCHSAAResults(athleteName: string, graduationYear: number, supabase: SupabaseClient) {
  if (!graduationYear || isNaN(graduationYear)) {
    return []
  }

  const { data: results } = await supabase
    .from("wrestling_nchsaa_results")
    .select("*")
    .ilike("wrestler_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4)
    .lte("year", graduationYear)
    .order("year", { ascending: false })

  return results || []
}

export default async function UnifiedProfilePage({ params }: UnifiedProfilePageProps) {
  const isPublicProfile = PUBLIC_PROFILE_IDS.has(params.id)
  // Use admin client for athlete fetch - same data source as 2026/2027 pages (public-rankings API)
  const supabase = createAdminClient()

  let currentUserId: string | null = null
  if (!isPublicProfile) {
    const authClient = await createClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()
    currentUserId = user?.id ?? null
  }

  const athlete = await getAthlete(params.id, supabase)

  if (!athlete) {
    notFound()
  }

  const rawNchsaa = await getNCHSAAResults(athlete.name, athlete.graduationyear, supabase)
  const nchsaaResults = (rawNchsaa || []).map((r: any) => ({
    year: r.year,
    place: r.place ?? r.place_finished ?? null,
    classification: r.classification ?? r.division ?? "",
    weight_class: r.weight_class ?? r.weight ?? "",
  }))

  // Primary: nhsca_placements + super32_results tables (source of truth). Fallback: athlete row.
  const athleteName = athlete.name ?? `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim()
  const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()

  let nhscaResults = await getNHSCAFromTables(supabase, athleteName, gradYear)
  const super32Results = await getSuper32FromTable(supabase, athleteName, gradYear)
  if (nhscaResults.length === 0) {
    const fromAthlete = buildPublicProfileTournamentData(athlete)
    nhscaResults = fromAthlete.nhscaResults
  }
  // Super32: only from super32_results table (no athlete-row fallback) to avoid wrong/duplicate data
    const athleteRowNational = getNationalTeamResults(athlete)
    const hs = athlete.highschool ?? athlete.highSchool ?? ""
    let ucdFromTable = await getUltimateClubDualsFromTables(supabase, athleteName, hs)
    if (ucdFromTable.length === 0 && athlete.wrestling_name?.trim() && athlete.wrestling_name.trim() !== athleteName) {
      ucdFromTable = await getUltimateClubDualsFromTables(supabase, athlete.wrestling_name.trim(), hs)
    }
    const nationalTeamResults = mergeNationalTeamResults(ucdFromTable, athleteRowNational)

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileViewTracker athleteId={athlete.id} athleteName={athlete.name || "Unknown"} />
      <AthleteDetail 
        athlete={athlete} 
        nchsaaResults={nchsaaResults} 
        currentUserId={currentUserId}
        tournamentResultsComponent={
          <div className="w-full">
            <TournamentResultsDisplay
              nchsaaResults={nchsaaResults}
              nhscaResults={nhscaResults}
              super32Results={super32Results}
              nationalTeamResults={nationalTeamResults}
              alwaysShowStructure={true}
            />
          </div>
        }
      />
    </div>
  )
}
