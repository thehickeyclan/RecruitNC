import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { AthleteDetail } from "@/components/athlete-detail"
import { MatchDataSection } from "@/components/match-data-section-improved"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"

interface UnifiedProfilePageProps {
  params: {
    id: string
  }
}

async function getAthlete(id: string) {
  const supabase = await createClient()

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

async function getNCHSAAResults(athleteName: string, graduationYear: number) {
  const supabase = await createClient()

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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const athlete = await getAthlete(params.id)

  if (!athlete) {
    notFound()
  }

  const nchsaaResults = await getNCHSAAResults(athlete.name, athlete.graduationyear)

  return (
    <div className="min-h-screen bg-gray-50">
      <AthleteDetail 
        athlete={athlete} 
        nchsaaResults={nchsaaResults} 
        currentUserId={user?.id || null}
        tournamentResultsComponent={
          <div className="container mx-auto px-4 py-8">
            <TournamentResultsDisplay
              nhscaResults={athlete.nhsca_results || []}
              super32Results={athlete.super32_results || []}
            />
          </div>
        }
      />
    </div>
  )
}
