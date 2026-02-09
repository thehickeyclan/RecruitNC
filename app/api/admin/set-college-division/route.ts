import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { clearDivisionMappingsCache } from "@/lib/get-division-from-mappings"
import { normalizeCollegeToCanonical } from "@/lib/canonical-college"
import { normalizeToCanonicalFull } from "@/lib/division-display"

/**
 * POST: Set division for one college in college_division_mappings (single source of truth).
 * Body: { college_name: string, division: string }
 * Used when user is prompted for a new/unknown college before saving an athlete.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const collegeName = (body.college_name ?? body.college ?? "").toString().trim()
    const division = (body.division ?? "").toString().trim()

    if (!collegeName) {
      return NextResponse.json({ success: false, error: "college_name required" }, { status: 400 })
    }

    const canonicalDivision = normalizeToCanonicalFull(division)
    if (!canonicalDivision) {
      return NextResponse.json(
        { success: false, error: "division must be NCAA Division I, II, III, NAIA, or NJCAA" },
        { status: 400 },
      )
    }

    const canonicalCollege = normalizeCollegeToCanonical(collegeName) || collegeName
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("college_division_mappings")
      .upsert(
        { college_name: canonicalCollege, division: canonicalDivision },
        { onConflict: "college_name" },
      )

    if (error) {
      console.error("[set-college-division]", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    clearDivisionMappingsCache()

    return NextResponse.json({ success: true, college_name: canonicalCollege, division: canonicalDivision })
  } catch (e) {
    console.error("[set-college-division]", e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    )
  }
}
