import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const updates = []
    const results = {
      total: athletes.length,
      updated: 0,
      unchanged: 0,
      details: [] as any[],
    }

    // Process each athlete
    for (const athlete of athletes) {
      const currentDivision = athlete.division || ""
      let newDivision = currentDivision

      // Normalize division values
      if (currentDivision.toLowerCase().includes("division i")) {
        newDivision = "NCAA D1"
      } else if (currentDivision.toLowerCase().includes("division ii")) {
        newDivision = "NCAA D2"
      } else if (currentDivision.toLowerCase().includes("division iii")) {
        newDivision = "NCAA D3"
      }

      // Only update if the division changed
      if (newDivision !== currentDivision) {
        const { error: updateError } = await supabase
          .from("athletes")
          .update({ division: newDivision })
          .eq("id", athlete.id)

        if (updateError) {
          results.details.push({
            id: athlete.id,
            name: athlete.name,
            error: updateError.message,
          })
        } else {
          results.updated++
          results.details.push({
            id: athlete.id,
            name: athlete.name,
            oldDivision: currentDivision,
            newDivision,
          })
        }
      } else {
        results.unchanged++
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
