import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getNHSCAFromTables } from "@/lib/tournament-tables"

async function getNCHSAAResults(supabase: any, athleteName: string, graduationYear: number) {
  if (!graduationYear || isNaN(graduationYear)) {
    return []
  }

  const { data: results } = await supabase
    .from("wrestling_nchsaa_results")
    .select("*")
    .ilike("wrestler_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4) // Get results from high school years
    .lte("year", graduationYear)
    .order("year", { ascending: false })

  return results || []
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2025"
    const gender = searchParams.get("gender") || "Male"
    const division = searchParams.get("division") || "all"

    const supabase = await createClient()

    let query = supabase
      .from("athletes")
      .select(`
        id,
        name,
        wrestling_name,
        firstname,
        lastname,
        firstName,
        lastName,
        graduationyear,
        gender,
        highschool,
        weight,
        college,
        prospect_ranking,
        previous_ranking,
        academic_gpa,
        nationally_ranked_wins,
        college_opens_experience,
        nhsca_2023_record,
        nhsca_2023_placement,
        nhsca_2024_record,
        nhsca_2024_placement,
        nhsca_2025_record,
        nhsca_2025_placement,
        super_32_2024_record,
        super_32_2024_placement,
        super_32_2025_record,
        super_32_2025_placement,
        highSchoolLogoUrl
      `)
      .eq("graduationyear", year)
      .eq("gender", gender)

    if (division !== "all") {
      if (division === "") {
        query = query.or("highSchoolLogoUrl.is.null,highSchoolLogoUrl.eq.")
      } else {
        query = query.eq("highSchoolLogoUrl", division)
      }
    }

    const { data: athletes, error } = await query.order("prospect_ranking", { ascending: true, nullsLast: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    const athletesWithResults = []
    for (const athlete of athletes || []) {
      const athleteName = athlete.wrestling_name || athlete.name || [athlete.firstName ?? athlete.firstname, athlete.lastName ?? athlete.lastname].filter(Boolean).join(" ").trim()
      const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
      const [nchsaaResults, nhscaFromTables] = await Promise.all([
        getNCHSAAResults(supabase, athleteName, gradYear),
        getNHSCAFromTables(supabase, athleteName, gradYear),
      ])

      athletesWithResults.push({
        ...athlete,
        nchsaa_results: nchsaaResults.map((result: any) => ({
          year: result.year,
          place: result.place,
          classification: result.classification,
          weight_class: result.weight_class,
          school: result.school,
        })),
        nhsca_results: nhscaFromTables.map((r) => ({
          year: r.year,
          placement: r.placement,
          record: r.record,
        })),
      })
    }

    return NextResponse.json({ athletes: athletesWithResults })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { rankings } = await request.json()

    console.log("[v0] Simple ranking API - Received rankings:", rankings?.length || 0)
    console.log("[v0] Simple ranking API - Sample rankings:", rankings?.slice(0, 3))

    const graduationYears = [...new Set(rankings?.map((r) => r.graduationYear || "unknown"))]
    console.log("[v0] Simple ranking API - Graduation years being updated:", graduationYears)

    const supabase = await createClient()

    const updatePromises = rankings.map(async ({ id, ranking, current_ranking }) => {
      console.log(`[v0] Updating athlete ${id} from ranking ${current_ranking} to ${ranking}`)
      const { data, error } = await supabase
        .from("athletes")
        .update({
          prospect_ranking: ranking,
          // Save current ranking as previous ranking
          previous_ranking: current_ranking,
        })
        .eq("id", id)
        .select("id, name, graduationyear, prospect_ranking, previous_ranking")

      if (error) {
        console.error(`[v0] Failed to update athlete ${id}:`, error)
        return { id, success: false, error }
      } else {
        console.log(`[v0] Successfully updated athlete ${id}:`, data?.[0])
        return { id, success: true, data: data?.[0] }
      }
    })

    const results = await Promise.all(updatePromises)
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(`[v0] Simple ranking API - Updates completed: ${successful} successful, ${failed} failed`)

    const { data: verification, error: verifyError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, prospect_ranking, previous_ranking")
      .eq("graduationyear", "2026") // Use string format for graduation year to match public rankings API
      .eq("gender", "Male")
      .not("prospect_ranking", "is", null)
      .order("prospect_ranking", { ascending: true })

    console.log("[v0] Verification - 2026 athletes with rankings after update:", verification?.length || 0)
    console.log("[v0] Verification - Sample 2026 ranked athletes:", verification?.slice(0, 3))

    return NextResponse.json({
      success: true,
      updated: successful,
      failed: failed,
      details: results,
      verification: {
        count_2026_with_rankings: verification?.length || 0,
        sample_2026_athletes: verification?.slice(0, 3) || [],
      },
    })
  } catch (error) {
    console.error("[v0] Update error:", error)
    return NextResponse.json({ error: "Failed to update rankings" }, { status: 500 })
  }
}
