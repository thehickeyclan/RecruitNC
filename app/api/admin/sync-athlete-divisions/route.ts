import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDivisionFromMappings, clearDivisionMappingsCache } from "@/lib/get-division-from-mappings"

/**
 * POST: Fill division only when athlete.division is empty. Never overwrite existing division
 * (respects admin edits like Brock Sullivan → D3). Uses college_division_mappings for lookup.
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

      const currentDivision = (athlete.division ?? "").trim()
      if (currentDivision) continue // never overwrite — only fill when empty

      const correctDivision = await getDivisionFromMappings(college)
      if (!correctDivision) continue

      const { error: updateError } = await supabase
        .from("athletes")
        .update({ division: correctDivision })
        .eq("id", athlete.id)

      if (updateError) {
        console.error(`[sync-athlete-divisions] update failed for ${athlete.id}:`, updateError)
        continue
      }
      updated++
      changes.push({
        id: athlete.id,
        college,
        oldDivision: "(empty)",
        newDivision: correctDivision,
      })
    }

    clearDivisionMappingsCache()

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
