import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { AthleteDetail } from "@/components/athlete-detail"
import { MatchDataSection } from "@/components/match-data-section-improved"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"

const PUBLIC_PROFILE_IDS = new Set(
  (process.env.PUBLIC_PROFILE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
)

interface UnifiedProfilePageProps {
  params: {
    id: string
  }
}

async function getAthlete(id: string, supabase: SupabaseClient) {
  const { data: athlete, error } = await supabase
    .from("athletes")
    .select(`
      *
    `)
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

  const nchsaaResults = await getNCHSAAResults(athlete.name, athlete.graduationyear, supabase)

  return (
    <div className="min-h-screen bg-gray-50">
      <AthleteDetail 
        athlete={athlete} 
        nchsaaResults={nchsaaResults} 
        currentUserId={currentUserId}
        tournamentResultsComponent={
          <div className="container mx-auto px-4 py-8">
            <TournamentResultsDisplay
              nchsaaResults={nchsaaResults}
              nhscaResults={athlete.nhsca_results || []}
              super32Results={athlete.super32_results || []}
            />
          </div>
        }
      />
    </div>
  )
}
