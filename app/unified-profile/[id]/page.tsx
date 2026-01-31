import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { buildPublicProfileTournamentData } from "@/lib/public-profile-data"
import { getNationalTeamResults } from "@/lib/tournament-utils"

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

async function getNHSCAResultsFromTable(athleteName: string, graduationYear: number, supabase: SupabaseClient) {
  if (!graduationYear || isNaN(graduationYear) || !athleteName?.trim()) return []
  const { data: results } = await supabase
    .from("wrestling_nhsca_results")
    .select("*")
    .ilike("athlete_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4)
    .lte("year", graduationYear)
    .order("year", { ascending: false })
  if (!results?.length) return []
  return results.map((r: any) => ({
    year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
    placement: String(r.placement ?? r.place ?? ""),
    record: (r.record ?? r.record_text ?? "").toString().trim(),
    weight: r.weight ?? "",
    division: r.division ?? "",
  }))
}

async function getSuper32ResultsFromTable(athleteName: string, graduationYear: number, supabase: SupabaseClient) {
  if (!graduationYear || isNaN(graduationYear) || !athleteName?.trim()) return []
  const { data: results } = await supabase
    .from("wrestling_super32_results")
    .select("*")
    .ilike("athlete_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4)
    .lte("year", graduationYear)
    .order("year", { ascending: false })
  if (!results?.length) return []
  return results.map((r: any) => ({
    year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
    placement: String(r.placement ?? r.place ?? ""),
    record: (r.record ?? r.record_text ?? "").toString().trim(),
    weight: r.weight ?? "",
    division: r.division ?? "",
  }))
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

  // Primary: athlete row (same as 2026/2027). Fallback: wrestling_nhsca_results, wrestling_super32_results
  const athleteName = athlete.name ?? `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim()
  const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()

  let { nhscaResults, super32Results } = buildPublicProfileTournamentData(athlete)
  if (nhscaResults.length === 0) {
    nhscaResults = await getNHSCAResultsFromTable(athleteName, gradYear, supabase)
  }
  if (super32Results.length === 0) {
    super32Results = await getSuper32ResultsFromTable(athleteName, gradYear, supabase)
  }

  const nationalTeamResults = getNationalTeamResults(athlete)

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileViewTracker athleteId={athlete.id} athleteName={athlete.name || "Unknown"} />
      <AthleteDetail 
        athlete={athlete} 
        nchsaaResults={nchsaaResults} 
        currentUserId={currentUserId}
        tournamentResultsComponent={
          <div className="container mx-auto px-4 py-8">
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
