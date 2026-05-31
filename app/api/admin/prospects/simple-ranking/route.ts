import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2025"
    const gender = searchParams.get("gender") || "Male"
    const division = searchParams.get("division") || "all"
    const debug = searchParams.get("debug") === "1"

    const supabase = await createClient()
    const db = createAdminClient()

    // Use admin client for athletes query so we see all prospects (same as public rankings).
    // createClient() is subject to RLS and can return fewer rows.
    // Match public-rankings API: year as string, case-insensitive gender
    const yearParam = String(year || "").trim() || "2025"

    let query = db
      .from("athletes")
      .select("*")
      .eq("graduationyear", yearParam)
      .ilike("gender", String(gender || "Male"))

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

    const athletesWithResults = await Promise.all(
      (athletes || []).map(async (athlete) => {
        const { nchsaa, nhsca, super32 } = await loadAthleteTournamentBundle(
          db,
          athlete as Record<string, unknown>,
        )
        const athleteNchsaa = nchsaa.map((r) => ({
          year: r.year,
          place: r.place,
          classification: r.classification,
          weight_class: r.weight_class,
          school: r.school,
        }))

        const debugInfo = debug
          ? {
              name: (athlete.name || "").trim(),
              wrestling_name: (athlete.wrestling_name || "").trim() || null,
              nchsaa_merged_count: athleteNchsaa.length,
              nchsaa_years: [...new Set(athleteNchsaa.map((r) => r.year))].sort((a, b) => b - a),
              merge: "loadAthleteTournamentBundle",
            }
          : undefined

        const s3223 = super32.find((r) => r.year === 2023)
        const s3224 = super32.find((r) => r.year === 2024)
        const s3225 = super32.find((r) => r.year === 2025)

        return {
          ...athlete,
          ...(debug && debugInfo ? { _debug: debugInfo } : {}),
          super_32_2023_record: s3223?.record || athlete.super_32_2023_record,
          super_32_2023_placement: s3223?.placement || athlete.super_32_2023_placement,
          super_32_2024_record: s3224?.record || athlete.super_32_2024_record,
          super_32_2024_placement: s3224?.placement || athlete.super_32_2024_placement,
          super_32_2025_record: s3225?.record || athlete.super_32_2025_record,
          super_32_2025_placement: s3225?.placement || athlete.super_32_2025_placement,
          nchsaa_results: athleteNchsaa,
          nhsca_results: nhsca.map((r) => ({
            year: r.year,
            placement: r.placement,
            record: r.record,
            weight: r.weight,
            division: r.division,
          })),
        }
      }),
    )

    return NextResponse.json({
      athletes: athletesWithResults,
      meta: {
        year,
        gender,
        division,
        count: athletesWithResults.length,
        ...(debug
          ? {
              _debug: {
                source:
                  "loadAthleteTournamentBundle (lib/athlete-tournament-bundle.ts)",
                table: "wrestling_nchsaa_results",
                total_athletes: athletesWithResults.length,
                athletes_with_nchsaa: athletesWithResults.filter((a) => a.nchsaa_results?.length > 0).length,
                per_athlete: athletesWithResults.map((a) => (a as { _debug?: unknown })._debug).filter(Boolean),
              },
            }
          : {}),
      },
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { rankings } = await request.json()

    const supabase = await createClient()

    const updatePromises = rankings.map(async ({ id, ranking, current_ranking }) => {
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
      }
      return { id, success: true, data: data?.[0] }
    })

    const results = await Promise.all(updatePromises)
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    const { data: verification, error: verifyError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, prospect_ranking, previous_ranking")
      .eq("graduationyear", "2026") // Use string format for graduation year to match public rankings API
      .eq("gender", "Male")
      .not("prospect_ranking", "is", null)
      .order("prospect_ranking", { ascending: true })

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
