import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { normalizeCollegeName } from "@/lib/college-utils"

// Known college divisions mapping
const knownCollegeDivisions: Record<string, string> = {
  // D1 Schools
  "nc state": "NCAA D1",
  "north carolina state": "NCAA D1",
  unc: "NCAA D1",
  "unc chapel hill": "NCAA D1",
  "north carolina": "NCAA D1",
  "university of north carolina": "NCAA D1",
  "appalachian state": "NCAA D1",
  "app state": "NCAA D1",
  campbell: "NCAA D1",
  "campbell university": "NCAA D1",
  davidson: "NCAA D1",
  "davidson college": "NCAA D1",
  duke: "NCAA D1",
  "duke university": "NCAA D1",
  elon: "NCAA D1",
  "elon university": "NCAA D1",
  "gardner-webb": "NCAA D1",
  "gardner webb": "NCAA D1",
  "high point": "NCAA D1",
  "high point university": "NCAA D1",

  // D2 Schools
  "belmont abbey": "NCAA D2",
  "belmont abbey college": "NCAA D2",
  "unc pembroke": "NCAA D2",
  pembroke: "NCAA D2",
  queens: "NCAA D2",
  "queens university": "NCAA D2",
  limestone: "NCAA D2",
  "limestone university": "NCAA D2",
  coker: "NCAA D2",
  "coker university": "NCAA D2",
  newberry: "NCAA D2",
  "newberry college": "NCAA D2",
  "mars hill": "NCAA D2",
  "mars hill university": "NCAA D2",
  king: "NCAA D2",
  "king university": "NCAA D2",
  barton: "NCAA D2",
  "barton college": "NCAA D2",
  emmanuel: "NCAA D2",
  "emmanuel college": "NCAA D2",
  "lees-mcrae": "NCAA D2",
  "lees mcrae": "NCAA D2",
  "lenoir-rhyne": "NCAA D2",
  "lenoir rhyne": "NCAA D2",
  wingate: "NCAA D2",
  "wingate university": "NCAA D2",

  // D3 Schools
  roanoke: "NCAA D3",
  "roanoke college": "NCAA D3",
  ferrum: "NCAA D3",
  "ferrum college": "NCAA D3",
  greensboro: "NCAA D3",
  marymount: "NCAA D3",
  "greensboro college": "NCAA D3",
  guilford: "NCAA D3",
  "guilford college": "NCAA D3",
  methodist: "NCAA D3",
  "methodist university": "NCAA D3",
  "nc wesleyan": "NCAA D3",
  "north carolina wesleyan": "NCAA D3",
  averett: "NCAA D3",
  "averett university": "NCAA D3",
  "washington and lee": "NCAA D3",
  "washington & lee": "NCAA D3",
  "hampden-sydney": "NCAA D3",
  "hampden sydney": "NCAA D3",
  "randolph-macon": "NCAA D3",
  "randolph macon": "NCAA D3",
  bridgewater: "NCAA D3",
  "bridgewater college": "NCAA D3",
  shenandoah: "NCAA D3",
  "shenandoah university": "NCAA D3",
}

export async function GET() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, college, division")
      .not("college", "is", null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const updates = []

    // Process each athlete and update division based on college
    for (const athlete of athletes) {
      if (!athlete.college) continue

      // Normalize the college name
      const normalizedName = normalizeCollegeName(athlete.college).toLowerCase()

      // Check if we have a known division for this college
      const knownDivision = knownCollegeDivisions[normalizedName]

      // Only update if we have a known division and it's different from the current one
      if (knownDivision && knownDivision !== athlete.division) {
        const { data, error: updateError } = await supabase
          .from("athletes")
          .update({ division: knownDivision })
          .eq("id", athlete.id)
          .select()

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
        } else {
          updates.push({
            id: athlete.id,
            college: athlete.college,
            oldDivision: athlete.division || "(none)",
            newDivision: knownDivision,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} college division entries`,
      updates,
    })
  } catch (error) {
    console.error("Error fixing college divisions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
