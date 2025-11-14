import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Define campus-specific division mappings
    const campusDivisions = [
      { name: "UNC Chapel Hill", pattern: "%UNC Chapel Hill%", division: "Division I" },
      { name: "UNC Charlotte", pattern: "%UNC Charlotte%", division: "Division I" },
      { name: "UNC Pembroke", pattern: "%UNC Pembroke%", division: "Division II" },
      { name: "UNC Greensboro", pattern: "%UNC Greensboro%", division: "Division I" },
      { name: "UNC Wilmington", pattern: "%UNC Wilmington%", division: "Division I" },
      { name: "UNC Asheville", pattern: "%UNC Asheville%", division: "Division I" },
      { name: "NC State", pattern: "%NC State%", division: "Division I" },
      { name: "North Carolina State", pattern: "%North Carolina State%", division: "Division I" },
    ]

    const updates = []
    let totalUpdated = 0

    // Process each campus
    for (const campus of campusDivisions) {
      const { data: athletes, error } = await supabase
        .from("athletes")
        .select("id, name, college, division")
        .ilike("college", campus.pattern)

      if (error) {
        console.error(`Error fetching ${campus.name} athletes:`, error)
        continue
      }

      console.log(`Found ${athletes.length} athletes for ${campus.name}`)

      // Update athletes with incorrect division
      for (const athlete of athletes) {
        if (athlete.division !== campus.division) {
          const { error: updateError } = await supabase
            .from("athletes")
            .update({ division: campus.division })
            .eq("id", athlete.id)

          if (updateError) {
            console.error(`Error updating athlete ${athlete.id}:`, updateError)
          } else {
            totalUpdated++
            updates.push({
              id: athlete.id,
              name: athlete.name,
              college: athlete.college,
              oldDivision: athlete.division,
              newDivision: campus.division,
            })
          }
        }
      }
    }

    // Handle generic "UNC" or "University of North Carolina" without specific campus
    const { data: genericUncAthletes, error: genericUncError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .or("college.ilike.%University of North Carolina%,college.eq.UNC,college.eq.University of North Carolina")
      .not("college", "ilike", "%Pembroke%")
      .not("college", "ilike", "%Charlotte%")
      .not("college", "ilike", "%Greensboro%")
      .not("college", "ilike", "%Wilmington%")
      .not("college", "ilike", "%Asheville%")

    if (genericUncError) {
      console.error("Error fetching generic UNC athletes:", genericUncError)
    } else {
      console.log(`Found ${genericUncAthletes.length} generic UNC athletes`)

      // Assume generic UNC references are to Chapel Hill (Division I)
      for (const athlete of genericUncAthletes) {
        if (athlete.division !== "Division I") {
          const { error: updateError } = await supabase
            .from("athletes")
            .update({ division: "Division I" })
            .eq("id", athlete.id)

          if (updateError) {
            console.error(`Error updating athlete ${athlete.id}:`, updateError)
          } else {
            totalUpdated++
            updates.push({
              id: athlete.id,
              name: athlete.name,
              college: athlete.college,
              oldDivision: athlete.division,
              newDivision: "Division I",
            })
          }
        }
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${totalUpdated} athletes`,
      totalUpdated,
      updates: updates.slice(0, 100), // Limit to first 100 updates to avoid response size issues
    })
  } catch (error) {
    console.error("Error in fix-unc-campuses route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
