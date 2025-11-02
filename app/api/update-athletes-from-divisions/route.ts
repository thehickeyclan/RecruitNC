import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Step 1: Get all division mappings
    const { data: divisionMappings, error: mappingsError } = await supabase.from("divisions").select("*")

    if (mappingsError) {
      return NextResponse.json(
        { error: `Failed to fetch division mappings: ${mappingsError.message}` },
        { status: 500 },
      )
    }

    if (!divisionMappings || divisionMappings.length === 0) {
      return NextResponse.json({ error: "No division mappings found" }, { status: 400 })
    }

    // Create a map for faster lookups
    const divisionMap = new Map()
    divisionMappings.forEach((mapping) => {
      divisionMap.set(mapping.name.toLowerCase(), mapping.division)
    })

    // Step 2: Get all athletes with college commitments
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)
      .not("college", "eq", "")

    if (athletesError) {
      return NextResponse.json({ error: `Failed to fetch athletes: ${athletesError.message}` }, { status: 500 })
    }

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({ message: "No athletes with college commitments found" }, { status: 200 })
    }

    // Step 3: Update athletes with correct divisions
    let updatedCount = 0
    let unknownCount = 0

    for (const athlete of athletes) {
      if (!athlete.college) continue

      const collegeName = athlete.college.toLowerCase()
      const correctDivision = divisionMap.get(collegeName)

      if (correctDivision && athlete.division !== correctDivision) {
        const { error: updateError } = await supabase
          .from("athletes")
          .update({ division: correctDivision, updated_at: new Date().toISOString() })
          .eq("id", athlete.id)

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
          continue
        }

        updatedCount++
      } else if (!correctDivision) {
        unknownCount++
        console.log(`No division mapping found for college: ${athlete.college}`)
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      unknownCount,
      totalAthletes: athletes.length,
      message: `Updated ${updatedCount} athletes with correct divisions. ${unknownCount} colleges not found in mappings.`,
    })
  } catch (error) {
    console.error("Error updating athlete divisions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
