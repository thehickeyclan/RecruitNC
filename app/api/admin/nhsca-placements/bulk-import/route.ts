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
      return NextResponse.json({ error: "Placements array is required" }, { status: 400 })
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

    // Insert into database
    const { data, error } = await supabase.from("nhsca_placements").insert(formattedPlacements).select()

    if (error) {
      console.error("Error importing NHSCA placements:", error)
      return NextResponse.json({ error: "Failed to import placements", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      message: `Successfully imported ${data?.length || 0} NHSCA placements`,
    })
  } catch (error: any) {
    console.error("Bulk import error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

