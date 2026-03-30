import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminAuth } from "@/lib/cached-auth-check"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Delete all NHSCA placements for a specific year
 * Use this to completely clear data before re-importing
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check admin access
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const division = searchParams.get("division")?.trim()

    if (!year) {
      return NextResponse.json({ error: "Year parameter is required" }, { status: 400 })
    }

    const yearNum = parseInt(year)
    if (isNaN(yearNum)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    // Delete NC rows for this year; optional `division` = Senior | Junior (same as bulk-import) so one division can be cleared without wiping the other.
    let q = supabase.from("nhsca_placements").delete().eq("year", yearNum).eq("state", "NC")
    if (division) {
      q = q.eq("division", division)
    }
    const { data, error } = await q.select()

    if (error) {
      console.error("Error deleting placements:", error)
      return NextResponse.json({ error: "Failed to delete placements", details: error.message }, { status: 500 })
    }

    const deletedCount = data?.length || 0

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: division
        ? `Successfully deleted ${deletedCount} ${division} placements for year ${yearNum} (NC)`
        : `Successfully deleted ${deletedCount} placements for year ${yearNum} (NC, all divisions)`,
      division: division || null,
    })
  } catch (error: any) {
    console.error("Delete year error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

