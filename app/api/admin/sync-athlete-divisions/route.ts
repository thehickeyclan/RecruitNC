import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDivisionFromMappings } from "@/lib/get-division-from-mappings"

/**
 * POST: Set every athlete's division from college_division_mappings (by college name).
 * Use this to fix hundreds of wrong athlete.division values in one go.
 * Reads college_division_mappings (and code fallbacks for Mount Olive, etc.), then updates athletes.division.
 */
export async function POST() {
  try {
    const supabase = createAdminClient()

    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, college, division")
      .not("college", "is", null)
      .neq("college", "")

    if (fetchError) {
      console.error("[sync-athlete-divisions] fetch error:", fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    if (!athletes?.length) {
      return NextResponse.json({ success: true, updated: 0, message: "No athletes with college to sync." })
    }

    let updated = 0
    const changes: { id: string; college: string; oldDivision: string; newDivision: string }[] = []

    for (const athlete of athletes) {
      const college = (athlete.college ?? "").trim()
      if (!college) continue

      const correctDivision = await getDivisionFromMappings(college)
      if (!correctDivision) continue

      const currentDivision = (athlete.division ?? "").trim()
      const normalizedNew = correctDivision
      if (currentDivision === normalizedNew) continue

      const { error: updateError } = await supabase
        .from("athletes")
        .update({ division: normalizedNew })
        .eq("id", athlete.id)

      if (updateError) {
        console.error(`[sync-athlete-divisions] update failed for ${athlete.id}:`, updateError)
        continue
      }
      updated++
      changes.push({
        id: athlete.id,
        college,
        oldDivision: currentDivision || "(empty)",
        newDivision: normalizedNew,
      })
    }

    return NextResponse.json({
      success: true,
      updated,
      totalWithCollege: athletes.length,
      changes: changes.slice(0, 50),
    })
  } catch (e) {
    console.error("[sync-athlete-divisions] error:", e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    )
  }
}
