import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDivisionFromMappings } from "@/lib/get-division-from-mappings"

/**
 * Diagnostic: does the app see college_division_mappings (the real table) and return correct divisions?
 * Hit: GET /api/debug/division
 * - rawTable = direct SELECT from college_division_mappings (same table as your SQL export).
 * - If rowCount > 0 and Mount Olive = NCAA Division II → app and dashboard are the same DB.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: rows, error } = await supabase
      .from("college_division_mappings")
      .select("college_name, division")
      .limit(50)
      .order("college_name")

    const mountOlive = await getDivisionFromMappings("Mount Olive")
    const universityMountOlive = await getDivisionFromMappings("University of Mount Olive")
    const ncState = await getDivisionFromMappings("NC State")

    const rowCount = rows?.length ?? 0
    const mountOliveOk = mountOlive === "NCAA Division II"
    return NextResponse.json({
      ok: true,
      sameDatabaseCheck: mountOliveOk && rowCount > 0 ? "YES — app sees college_division_mappings and Mount Olive = DII" : rowCount === 0 ? "NO — app sees 0 rows from college_division_mappings" : "TABLE OK but lookup wrong — Mount Olive returned: " + (mountOlive || "(empty)"),
      college_division_mappings: {
        rowCount,
        error: error?.message ?? null,
        sample: (rows ?? []).slice(0, 15).map((r) => ({ college_name: r.college_name, division: r.division })),
      },
      getDivisionFromMappings: {
        "Mount Olive": mountOlive || "(empty)",
        "University of Mount Olive": universityMountOlive || "(empty)",
        "NC State": ncState || "(empty)",
      },
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
