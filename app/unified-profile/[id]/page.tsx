import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { AthleteDetail } from "@/components/athlete-detail"
import { MatchDataSection } from "@/components/match-data-section-improved"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"

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
  console.log("[unified-profile] requested", params.id, {
    rawPublicIds,
    isPublicProfile,
  })
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

  // Parse JSONB fields properly - they may come as strings from the database
  const parseJsonField = (field: any): any[] => {
    if (!field) return []
    if (Array.isArray(field)) return field
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  // NHSCA: use JSON first, fallback to column format (nhsca_2023/2024/2025_record, placement)
  const nhscaFromJson = parseJsonField(athlete.nhsca_results)
  const nhscaResults =
    nhscaFromJson.length > 0
      ? nhscaFromJson.map((r: any) => ({
          year: typeof r.year === "number" ? r.year : parseInt(r.year, 10) || new Date().getFullYear(),
          placement: r.placement || r.place || "",
          record: r.record ?? undefined,
          weight: r.weight ?? undefined,
          division: r.division ?? undefined,
        }))
      : [2025, 2024, 2023]
          .filter(
            (y) =>
              (athlete as any)[`nhsca_${y}_record`] || (athlete as any)[`nhsca_${y}_placement`]
          )
          .map((year) => ({
            year,
            placement: String((athlete as any)[`nhsca_${year}_placement`] ?? ""),
            record: (athlete as any)[`nhsca_${year}_record`] ?? undefined,
          }))

  // Super 32: use JSON first, fallback to column format (super_32_2023/2024/2025_record, placement)
  const super32FromJson = parseJsonField(athlete.super32_results)
  const super32Results =
    super32FromJson.length > 0
      ? super32FromJson.map((r: any) => ({
          year: typeof r.year === "number" ? r.year : parseInt(r.year, 10) || new Date().getFullYear(),
          placement: r.placement || r.place || "",
          record: r.record ?? undefined,
          weight: r.weight ?? undefined,
          division: r.division ?? undefined,
        }))
      : [2025, 2024, 2023]
          .filter(
            (y) =>
              (athlete as any)[`super_32_${y}_record`] || (athlete as any)[`super_32_${y}_placement`]
          )
          .map((year) => ({
            year,
            placement: String((athlete as any)[`super_32_${year}_placement`] ?? ""),
            record: (athlete as any)[`super_32_${year}_record`] ?? undefined,
          }))

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
            />
          </div>
        }
      />
    </div>
  )
}
