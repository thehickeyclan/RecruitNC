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

/** Max time to wait for profile data before returning error (avoid Vercel "---" hang). */
const PROFILE_FETCH_TIMEOUT_MS = 20000

interface UnifiedProfilePageProps {
  params: Promise<{ id: string }>
}

async function getAthlete(id: string, supabase: SupabaseClient): Promise<{
  athlete: Record<string, unknown> | null
  error: string | null
}> {
  const { data: athlete, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.log("[unified-profile] Athlete error:", id, error.code, error.message)
    return { athlete: null, error: `${error.code}: ${error.message}` }
  }
  if (!athlete) {
    return { athlete: null, error: "No row returned" }
  }
  return { athlete: athlete as Record<string, unknown>, error: null }
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[unified-profile] timeout: ${label} (${ms}ms)`)), ms)
    ),
  ])
}

async function getCurrentUserIdIfNeeded(isPublicProfile: boolean): Promise<string | null> {
  if (isPublicProfile) return null
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export default async function UnifiedProfilePage({ params }: UnifiedProfilePageProps) {
  try {
    const { id } = await params
    const isPublicProfile = PUBLIC_PROFILE_IDS.has(id)
    const supabase = createAdminClient()

    // Fetch athlete first so page never blocks on auth
    const result = await withTimeout(getAthlete(id, supabase), PROFILE_FETCH_TIMEOUT_MS, "getAthlete")
    if (result.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-lg shadow p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h1>
            <p className="text-sm text-red-600 font-mono mb-4">Supabase: {result.error}</p>
            <a href="/prospects/all" className="text-[#002147] underline">View all prospects</a>
          </div>
        </div>
      )
    }
    const athlete = result.athlete
    if (!athlete) {
      notFound()
    }

    const athleteName = athlete.name ?? `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim()
    const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
    const hs = athlete.highschool ?? athlete.highSchool ?? ""

    // Auth + all other data in parallel so auth can't hang the page
    const [currentUserId, rawNchsaa, nhscaFromTable, super32Results, ucdFromTable1] = await Promise.all([
      getCurrentUserIdIfNeeded(isPublicProfile),
      getNCHSAAResults(athlete.name, athlete.graduationyear, supabase),
      getNHSCAFromTables(supabase, athleteName, gradYear),
      getSuper32FromTable(supabase, athleteName, gradYear),
      getUltimateClubDualsFromTables(supabase, athleteName, hs),
    ])
    const nchsaaResults = (rawNchsaa || []).map((r: any) => ({
      year: r.year,
      place: r.place ?? r.place_finished ?? null,
      classification: r.classification ?? r.division ?? "",
      weight_class: r.weight_class ?? r.weight ?? "",
    }))

    let nhscaResults = nhscaFromTable
    if (nhscaResults.length === 0) {
      const fromAthlete = buildPublicProfileTournamentData(athlete)
      nhscaResults = fromAthlete.nhscaResults
    }
    const athleteRowNational = getNationalTeamResults(athlete)
    let ucdFromTable = ucdFromTable1
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[unified-profile] Page error:", message, err)
    if (message.includes("not found") || (err as any)?.digest === "NEXT_NOT_FOUND") {
      notFound()
    }
    throw err
  }
}
