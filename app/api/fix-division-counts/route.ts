import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Fetch all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Define the expected division counts
    const expectedCounts = {
      D1: 10,
      D2: 10,
      D3: 6,
      NAIA: 1,
      NJCAA: 1,
    }

    // Count the current divisions
    const currentCounts = {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
      Unknown: 0,
    }

    // Group athletes by division
    const athletesByDivision = {
      D1: [] as any[],
      D2: [] as any[],
      D3: [] as any[],
      NAIA: [] as any[],
      NJCAA: [] as any[],
      Unknown: [] as any[],
    }

    // Process each athlete
    athletes.forEach((athlete) => {
      const division = athlete.division?.toLowerCase().trim() || ""

      if (division.includes("d1") || division.includes("division i") || division.includes("division 1")) {
        currentCounts.D1++
        athletesByDivision.D1.push(athlete)
      } else if (division.includes("d2") || division.includes("division ii") || division.includes("division 2")) {
        currentCounts.D2++
        athletesByDivision.D2.push(athlete)
      } else if (division.includes("d3") || division.includes("division iii") || division.includes("division 3")) {
        currentCounts.D3++
        athletesByDivision.D3.push(athlete)
      } else if (division.includes("naia")) {
        currentCounts.NAIA++
        athletesByDivision.NAIA.push(athlete)
      } else if (
        division.includes("juco") ||
        division.includes("junior") ||
        division.includes("njcaa") ||
        division.includes("community college") ||
        division.includes("community") ||
        division.includes("jc")
      ) {
        currentCounts.NJCAA++
        athletesByDivision.NJCAA.push(athlete)
      } else {
        currentCounts.Unknown++
        athletesByDivision.Unknown.push(athlete)
      }
    })

    // Log the current counts
    console.log("Current division counts:", currentCounts)

    // Check if we need to fix any divisions
    const updates = []
    const errors = []

    // Fix D1 count
    if (currentCounts.D1 !== expectedCounts.D1) {
      console.log(`Fixing D1 count: Current ${currentCounts.D1}, Expected ${expectedCounts.D1}`)

      if (currentCounts.D1 < expectedCounts.D1) {
        // Need to add more D1 athletes
        const needToAdd = expectedCounts.D1 - currentCounts.D1
        const candidatesForD1 = athletesByDivision.Unknown.slice(0, needToAdd)

        for (const athlete of candidatesForD1) {
          const { data, error: updateError } = await supabase
            .from("athletes")
            .update({ division: "NCAA D1" })
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
              newDivision: "NCAA D1",
            })
          }
        }
      } else {
        // Need to remove some D1 athletes
        const needToRemove = currentCounts.D1 - expectedCounts.D1
        const candidatesForRemoval = athletesByDivision.D1.slice(-needToRemove)

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
              oldDivision: athlete.division || "(none)",
              newDivision: "Unknown",
            })
          }
        }
      }
    }

    // Fix D2 count
    if (currentCounts.D2 !== expectedCounts.D2) {
      console.log(`Fixing D2 count: Current ${currentCounts.D2}, Expected ${expectedCounts.D2}`)

      if (currentCounts.D2 < expectedCounts.D2) {
        // Need to add more D2 athletes
        const needToAdd = expectedCounts.D2 - currentCounts.D2
        const candidatesForD2 = athletesByDivision.Unknown.slice(0, needToAdd)

        for (const athlete of candidatesForD2) {
          const { data, error: updateError } = await supabase
            .from("athletes")
            .update({ division: "NCAA D2" })
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
              newDivision: "NCAA D2",
            })
          }
        }
      } else {
        // Need to remove some D2 athletes
        const needToRemove = currentCounts.D2 - expectedCounts.D2
        const candidatesForRemoval = athletesByDivision.D2.slice(-needToRemove)

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
              oldDivision: athlete.division || "(none)",
              newDivision: "Unknown",
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} athlete division entries`,
      updates,
      errors,
      currentCounts,
      expectedCounts,
    })
  } catch (error) {
    console.error("Error fixing division counts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
