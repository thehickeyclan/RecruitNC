import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminAuth } from "@/lib/cached-auth-check"
import { mergeNHSCAResults } from "@/lib/nhsca-auto-fetch"

/**
 * Merge matched NHSCA placements into athlete profiles
 * This updates athletes.nhsca_results JSONB column with the placement data
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { year = 2025 } = await request.json()
    const supabase = createAdminClient()

    // Get all matched placements for this year that haven't been merged
    const { data: placements, error: placementsError } = await supabase
      .from("nhsca_placements")
      .select("*")
      .eq("year", year)
      .in("match_status", ["auto_matched", "manually_matched"])
      .is("merged_at", null)
      .not("athlete_id", "is", null)

    if (placementsError) {
      console.error("Error fetching placements:", placementsError)
      return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
    }

    if (!placements || placements.length === 0) {
      return NextResponse.json({
        success: true,
        merged: 0,
        message: "No placements to merge",
      })
    }

    // Group placements by athlete_id
    const placementsByAthlete = new Map<string, typeof placements>()
    for (const placement of placements) {
      if (!placement.athlete_id) continue
      const athleteId = placement.athlete_id
      if (!placementsByAthlete.has(athleteId)) {
        placementsByAthlete.set(athleteId, [])
      }
      placementsByAthlete.get(athleteId)!.push(placement)
    }

    let mergedCount = 0
    const errors: string[] = []
    const mergedPlacementIds: string[] = []

    // Update each athlete's nhsca_results
    for (const [athleteId, athletePlacements] of placementsByAthlete.entries()) {
      try {
        // Get current nhsca_results
        const { data: athlete, error: athleteError } = await supabase
          .from("athletes")
          .select("nhsca_results")
          .eq("id", athleteId)
          .single()

        if (athleteError || !athlete) {
          errors.push(`Athlete ${athleteId} not found`)
          continue
        }

        // Parse existing results or start with empty array
        let existingResults: any[] = []
        if (athlete.nhsca_results && Array.isArray(athlete.nhsca_results)) {
          existingResults = [...athlete.nhsca_results]
        }

        // Create new results from placements
        const newResults = athletePlacements.map((p) => ({
          year: p.year,
          placement:
            p.placement === null || p.placement === undefined
              ? "Participated" // For non-placers
              : p.placement === 1
                ? "Champion"
                : p.placement === 2
                  ? "Finalist"
                  : p.placement === 3
                    ? "3rd"
                    : p.placement === 4
                      ? "4th"
                      : p.placement === 5
                        ? "5th"
                        : p.placement === 6
                          ? "6th"
                          : p.placement === 7
                            ? "7th"
                            : p.placement === 8
                              ? "8th"
                              : p.placement.toString(),
          record: p.record || "",
          weight: p.weight_class || "",
          division: p.division || "",
          notes: p.notes || "",
          placed: p.placement !== null && p.placement !== undefined, // Flag for filtering
        }))

        // Merge: Use helper function to overwrite existing results for this year
        const mergedResults = mergeNHSCAResults(existingResults, newResults)

        // Update athlete
        const { error: updateError } = await supabase
          .from("athletes")
          .update({ nhsca_results: mergedResults })
          .eq("id", athleteId)

        if (updateError) {
          errors.push(`Failed to update athlete ${athleteId}: ${updateError.message}`)
          continue
        }

        mergedCount++
        for (const p of athletePlacements) {
          mergedPlacementIds.push(p.id)
        }
      } catch (error: any) {
        errors.push(`Error processing athlete ${athleteId}: ${error.message}`)
      }
    }

    // Mark only placements that succeeded (so failed rows stay mergeable)
    if (mergedPlacementIds.length > 0) {
      const { error: markError } = await supabase
        .from("nhsca_placements")
        .update({ merged_at: new Date().toISOString(), match_status: "merged" })
        .in("id", mergedPlacementIds)

      if (markError) {
        console.error("Error marking placements as merged:", markError)
      }
    }

    return NextResponse.json({
      success: true,
      merged: mergedCount,
      totalPlacements: placements.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Merged ${mergedCount} athletes with ${placements.length} placements`,
    })
  } catch (error: any) {
    console.error("Merge error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

