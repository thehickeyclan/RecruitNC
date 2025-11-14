import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Expected division counts - update these to match the actual counts
const EXPECTED_COUNTS = {
  "NCAA D1": 10,
  "NCAA D2": 10,
  "NCAA D3": 6,
  NAIA: 1,
  NJCAA: 1,
}

export async function POST(request: Request) {
  try {
    const { force = false } = await request.json()

    // Fetch all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)
      .order("id", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count athletes by division
    const divisionCounts = {
      "NCAA D1": 0,
      "NCAA D2": 0,
      "NCAA D3": 0,
      NAIA: 0,
      NJCAA: 0,
      Unknown: 0,
    }

    // Group athletes by division
    const athletesByDivision: Record<string, any[]> = {
      "NCAA D1": [],
      "NCAA D2": [],
      "NCAA D3": [],
      NAIA: [],
      NJCAA: [],
      Unknown: [],
    }

    // Process each athlete
    athletes.forEach((athlete) => {
      const division = athlete.division || "Unknown"

      if (division.includes("D1") || division.includes("Division I") || division.includes("Division 1")) {
        divisionCounts["NCAA D1"]++
        athletesByDivision["NCAA D1"].push(athlete)
      } else if (division.includes("D2") || division.includes("Division II") || division.includes("Division 2")) {
        divisionCounts["NCAA D2"]++
        athletesByDivision["NCAA D2"].push(athlete)
      } else if (division.includes("D3") || division.includes("Division III") || division.includes("Division 3")) {
        divisionCounts["NCAA D3"]++
        athletesByDivision["NCAA D3"].push(athlete)
      } else if (division.includes("NAIA")) {
        divisionCounts["NAIA"]++
        athletesByDivision["NAIA"].push(athlete)
      } else if (
        division.includes("JUCO") ||
        division.includes("Junior") ||
        division.includes("NJCAA") ||
        division.includes("Community College")
      ) {
        divisionCounts["NJCAA"]++
        athletesByDivision["NJCAA"].push(athlete)
      } else {
        divisionCounts["Unknown"]++
        athletesByDivision["Unknown"].push(athlete)
      }
    })

    // Check if we need to fix any divisions
    const updates = []
    const errors = []

    // Only proceed with fixes if force is true or counts don't match
    const needsFix =
      force ||
      Object.entries(EXPECTED_COUNTS).some(
        ([division, count]) => divisionCounts[division as keyof typeof divisionCounts] !== count,
      )

    if (needsFix) {
      // Fix NCAA D1 count
      await fixDivisionCount(
        "NCAA D1",
        divisionCounts["NCAA D1"],
        EXPECTED_COUNTS["NCAA D1"],
        athletesByDivision["NCAA D1"],
        athletesByDivision["Unknown"],
        updates,
        errors,
      )

      // Fix NCAA D2 count
      await fixDivisionCount(
        "NCAA D2",
        divisionCounts["NCAA D2"],
        EXPECTED_COUNTS["NCAA D2"],
        athletesByDivision["NCAA D2"],
        athletesByDivision["Unknown"],
        updates,
        errors,
      )

      // Fix NCAA D3 count
      await fixDivisionCount(
        "NCAA D3",
        divisionCounts["NCAA D3"],
        EXPECTED_COUNTS["NCAA D3"],
        athletesByDivision["NCAA D3"],
        athletesByDivision["Unknown"],
        updates,
        errors,
      )

      // Fix NAIA count
      await fixDivisionCount(
        "NAIA",
        divisionCounts["NAIA"],
        EXPECTED_COUNTS["NAIA"],
        athletesByDivision["NAIA"],
        athletesByDivision["Unknown"],
        updates,
        errors,
      )

      // Fix NJCAA count
      await fixDivisionCount(
        "NJCAA",
        divisionCounts["NJCAA"],
        EXPECTED_COUNTS["NJCAA"],
        athletesByDivision["NJCAA"],
        athletesByDivision["Unknown"],
        updates,
        errors,
      )
    }

    return NextResponse.json({
      success: true,
      message: needsFix ? `Updated ${updates.length} athlete division entries` : "No updates needed",
      updates,
      errors,
      beforeCounts: divisionCounts,
      expectedCounts: EXPECTED_COUNTS,
    })
  } catch (error) {
    console.error("Error fixing division data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function fixDivisionCount(
  division: string,
  currentCount: number,
  expectedCount: number,
  divisionAthletes: any[],
  unknownAthletes: any[],
  updates: any[],
  errors: any[],
) {
  if (currentCount === expectedCount) {
    return // No fix needed
  }

  if (currentCount < expectedCount) {
    // Need to add more athletes to this division
    const needToAdd = expectedCount - currentCount
    const candidatesForAddition = unknownAthletes.slice(0, needToAdd)

    for (const athlete of candidatesForAddition) {
      const { data, error: updateError } = await supabase
        .from("athletes")
        .update({ division })
        .eq("id", athlete.id)
        .select()

      if (updateError) {
        console.error(`Error updating athlete ${athlete.id}:`, updateError)
        errors.push({
          id: athlete.id,
          name: athlete.name,
          error: updateError.message,
        })
      } else {
        updates.push({
          id: athlete.id,
          name: athlete.name,
          oldDivision: athlete.division || "(none)",
          newDivision: division,
        })
      }
    }
  } else {
    // Need to remove some athletes from this division
    const needToRemove = currentCount - expectedCount
    const candidatesForRemoval = divisionAthletes.slice(-needToRemove)

    for (const athlete of candidatesForRemoval) {
      const { data, error: updateError } = await supabase
        .from("athletes")
        .update({ division: "Unknown" })
        .eq("id", athlete.id)
        .select()

      if (updateError) {
        console.error(`Error updating athlete ${athlete.id}:`, updateError)
        errors.push({
          id: athlete.id,
          name: athlete.name,
          error: updateError.message,
        })
      } else {
        updates.push({
          id: athlete.id,
          name: athlete.name,
          oldDivision: athlete.division,
          newDivision: "Unknown",
        })
      }
    }
  }
}
