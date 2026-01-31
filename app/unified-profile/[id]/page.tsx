import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { getNhscaResults, getSuper32Results, getNationalTeamResults } from "@/lib/tournament-utils"

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
  const supabase = isPublicProfile ? createAdminClient() : await createClient()

  let currentUserId: string | null = null
  if (!isPublicProfile) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    currentUserId = user?.id ?? null
  }

  const athlete = await getAthlete(params.id, supabase)

  if (!athlete) {
    notFound()
  }

  const rawNchsaa = await getNCHSAAResults(athlete.name, athlete.graduationyear, supabase)
  // Normalize to shape expected by TournamentResultsDisplay (same as public/school profiles)
  const nchsaaResults = (rawNchsaa || []).map((r: any) => ({
    year: r.year,
    place: r.place ?? r.place_finished ?? null,
    classification: r.classification ?? r.division ?? "",
    weight_class: r.weight_class ?? r.weight ?? "",
  }))

  // Use shared tournament utils; fall back to tables when athlete row has no data
  let nhscaResults = getNhscaResults(athlete)
  if (nhscaResults.length === 0) {
    nhscaResults = await getNHSCAResultsFromTable(athlete.name, athlete.graduationyear, supabase)
  }
  let super32Results = getSuper32Results(athlete)
  if (super32Results.length === 0) {
    super32Results = await getSuper32ResultsFromTable(athlete.name, athlete.graduationyear, supabase)
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
