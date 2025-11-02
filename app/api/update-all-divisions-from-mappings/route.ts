import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    console.log("🔄 Starting division update from mappings...")
    const supabase = createClient()

    // 1. Get all college-division mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from("college_division_mappings")
      .select("college_name, division")

    if (mappingsError) {
      console.error("❌ Failed to fetch mappings:", mappingsError)
      return NextResponse.json({ error: `Failed to fetch mappings: ${mappingsError.message}` }, { status: 500 })
    }

    if (!mappings || mappings.length === 0) {
      return NextResponse.json({ error: "No college-division mappings found" }, { status: 404 })
    }

    console.log(`📊 Found ${mappings.length} college mappings`)

    // 2. Create a mapping object for faster lookups
    const divisionMap = new Map<string, string>()
    mappings.forEach(({ college_name, division }) => {
      divisionMap.set(college_name.toLowerCase(), division)
    })

    // 3. Get all athletes with college commitments
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, college, division")
      .not("college", "is", null)
      .not("college", "eq", "")

    if (athletesError) {
      console.error("❌ Failed to fetch athletes:", athletesError)
      return NextResponse.json({ error: `Failed to fetch athletes: ${athletesError.message}` }, { status: 500 })
    }

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({ message: "No athletes with college commitments found" })
    }

    console.log(`👥 Processing ${athletes.length} athletes`)

    // 4. Update athletes in batches
    let updatedCount = 0
    let unknownCount = 0
    const unknownColleges = new Set<string>()

    for (const athlete of athletes) {
      if (!athlete.college) continue

      const collegeLower = athlete.college.toLowerCase()
      let division = divisionMap.get(collegeLower)

      // Try partial matching if exact match fails
      if (!division) {
        for (const [key, value] of divisionMap.entries()) {
          if (collegeLower.includes(key) || key.includes(collegeLower)) {
            division = value
            break
          }
        }
      }

      if (division && athlete.division !== division) {
        const { error: updateError } = await supabase.from("athletes").update({ division }).eq("id", athlete.id)

        if (!updateError) {
          updatedCount++
          console.log(`✅ Updated ${athlete.college} -> ${division}`)
        }
      } else if (!division) {
        unknownCount++
        unknownColleges.add(athlete.college)
      }
    }

    console.log(`✅ Update complete: ${updatedCount} updated, ${unknownCount} unknown`)

    return NextResponse.json({
      success: true,
      updatedCount,
      unknownCount,
      unknownColleges: Array.from(unknownColleges).slice(0, 10),
      message: `Successfully updated ${updatedCount} athletes. ${unknownCount} colleges not found in mappings.`,
    })
  } catch (error) {
    console.error("💥 Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
