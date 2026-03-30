import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminAuth } from "@/lib/cached-auth-check"

interface NHSCAPlacementRow {
  athlete_name: string
  high_school?: string
  placement: number
  weight_class: string
  division: string
  record?: string
  state?: string
  year?: number
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { placements, year = 2025 } = await request.json()

    if (!Array.isArray(placements) || placements.length === 0) {
      return NextResponse.json({ error: "Participants array is required" }, { status: 400 })
    }

    // Validate and format data
    const formattedPlacements = placements.map((row: NHSCAPlacementRow) => ({
      year: row.year || year,
      athlete_name: row.athlete_name?.trim(),
      high_school: row.high_school?.trim() || null,
      placement: row.placement ? parseInt(row.placement.toString()) : null, // Allow null for non-placers
      weight_class: row.weight_class?.trim(),
      division: row.division?.trim(),
      record: row.record?.trim() || null,
      state: row.state?.trim() || "NC",
      match_status: "unmatched",
      source: `bulk_import_${year}`,
    }))

    // Validate required fields (placement can be null for participants who didn't place)
    const invalidRows = formattedPlacements.filter(
      (p) => !p.athlete_name || !p.weight_class || !p.division
    )

    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid data",
          details: `Missing required fields in ${invalidRows.length} rows`,
          invalidRows: invalidRows.slice(0, 5), // Show first 5
        },
        { status: 400 }
      )
    }

    // OVERWRITE: Remove existing rows for this year/state **per division** in the payload only.
    // So Senior and Junior 2026 NC can coexist; re-importing Junior does not delete Senior.
    const uniqDivisions = [
      ...new Set(
        formattedPlacements.map((p) => p.division).filter((d): d is string => Boolean(d?.trim())),
      ),
    ]
    for (const div of uniqDivisions) {
      const { error: deleteError } = await supabase
        .from("nhsca_placements")
        .delete()
        .eq("year", year)
        .eq("state", "NC")
        .eq("division", div)

      if (deleteError) {
        console.error(`Error deleting placements for ${year} NC ${div}:`, deleteError)
      } else {
        console.log(`Deleted existing placements for year ${year} NC division ${div} before re-import`)
      }
    }

    // Insert into database
    const { data, error } = await supabase.from("nhsca_placements").insert(formattedPlacements).select()

    if (error) {
      console.error("Error importing NHSCA placements:", error)
      return NextResponse.json({ error: "Failed to import participants", details: error.message }, { status: 500 })
    }

    // Count placers vs non-placers for better messaging
    const placersCount = data?.filter((p: any) => p.placement !== null && p.placement !== undefined).length || 0
    const participantsCount = data?.length || 0
    
    return NextResponse.json({
      success: true,
      imported: participantsCount,
      placers: placersCount,
      nonPlacers: participantsCount - placersCount,
      message: `Successfully imported ${participantsCount} NHSCA participants (${placersCount} placers, ${participantsCount - placersCount} non-placers)`,
    })
  } catch (error: any) {
    console.error("Bulk import error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

