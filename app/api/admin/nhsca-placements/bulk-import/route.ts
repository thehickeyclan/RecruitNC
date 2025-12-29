import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

    // OVERWRITE: Delete ALL existing records for this year before importing new ones
    // This ensures that re-importing the same year completely overwrites instead of creating duplicates
    // Delete all records for this year and state, regardless of match status
    const { error: deleteError } = await supabase
      .from("nhsca_placements")
      .delete()
      .eq("year", year)
      .eq("state", "NC")

    if (deleteError) {
      console.error("Error deleting existing placements:", deleteError)
      // Continue anyway - might be first import
    } else {
      console.log(`Deleted all existing placements for year ${year} before re-import`)
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

