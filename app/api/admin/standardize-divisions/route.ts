import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Function to standardize division names
function standardizeDivision(division: string | null): string | null {
  if (!division) return null

  const divLower = division.toLowerCase().trim()

  // Division I variations
  if (
    divLower === "ncaa di" ||
    divLower === "ncaa d1" ||
    divLower === "ncaa division i" ||
    divLower === "ncaa division 1" ||
    divLower === "di" ||
    divLower === "d1" ||
    divLower === "division i" ||
    divLower === "division 1" ||
    divLower.includes("division i") ||
    divLower.includes("division 1") ||
    (divLower.includes("di") && !divLower.includes("dii") && !divLower.includes("diii")) ||
    (divLower.includes("d1") && !divLower.includes("d2") && !divLower.includes("d3")) ||
    divLower.includes("d-1") ||
    divLower.includes("d-i")
  ) {
    return "Division I"
  }

  // Division II variations
  if (
    divLower === "ncaa dii" ||
    divLower === "ncaa d2" ||
    divLower === "ncaa division ii" ||
    divLower === "ncaa division 2" ||
    divLower === "dii" ||
    divLower === "d2" ||
    divLower === "division ii" ||
    divLower === "division 2" ||
    divLower.includes("division ii") ||
    divLower.includes("division 2") ||
    divLower.includes("dii") ||
    divLower.includes("d2") ||
    divLower.includes("d-2") ||
    divLower.includes("d-ii")
  ) {
    return "Division II"
  }

  // Division III variations
  if (
    divLower === "ncaa diii" ||
    divLower === "ncaa d3" ||
    divLower === "ncaa division iii" ||
    divLower === "ncaa division 3" ||
    divLower === "diii" ||
    divLower === "d3" ||
    divLower === "division iii" ||
    divLower === "division 3" ||
    divLower.includes("division iii") ||
    divLower.includes("division 3") ||
    divLower.includes("diii") ||
    divLower.includes("d3") ||
    divLower.includes("d-3") ||
    divLower.includes("d-iii")
  ) {
    return "Division III"
  }

  // NAIA variations
  if (divLower.includes("naia")) {
    return "NAIA"
  }

  // NJCAA variations
  if (
    divLower.includes("njcaa") ||
    divLower.includes("juco") ||
    divLower.includes("junior college") ||
    divLower.includes("community college")
  ) {
    return "NJCAA"
  }

  // If no match, return the original
  return division
}

// Known college divisions mapping
const knownCollegeDivisions: Record<string, string> = {
  // DI Schools
  "nc state": "Division I",
  "north carolina state": "Division I",
  unc: "Division I",
  "unc chapel hill": "Division I",
  "north carolina": "Division I",
  "university of north carolina": "Division I",
  "appalachian state": "Division I",
  "app state": "Division I",
  campbell: "Division I",
  "campbell university": "Division I",
  davidson: "Division I",
  "davidson college": "Division I",
  duke: "Division I",
  "duke university": "Division I",
  elon: "Division I",
  "elon university": "Division I",
  "gardner-webb": "Division I",
  "gardner webb": "Division I",
  "high point": "Division I",
  "high point university": "Division I",

  // DII Schools
  "belmont abbey": "Division II",
  "belmont abbey college": "Division II",
  "unc pembroke": "Division II",
  pembroke: "Division II",
  queens: "Division II",
  "queens university": "Division II",
  limestone: "Division II",
  "limestone university": "Division II",
  coker: "Division II",
  "coker university": "Division II",
  newberry: "Division II",
  "newberry college": "Division II",
  "mars hill": "Division II",
  "mars hill university": "Division II",
  king: "Division II",
  "king university": "Division II",
  barton: "Division II",
  "barton college": "Division II",
  emmanuel: "Division II",
  "emmanuel college": "Division II",
  "lees-mcrae": "Division II",
  "lees mcrae": "Division II",
  "lenoir-rhyne": "Division II",
  "lenoir rhyne": "Division II",
  wingate: "Division II",
  "wingate university": "Division II",

  // DIII Schools
  roanoke: "Division III",
  "roanoke college": "Division III",
  ferrum: "Division III",
  "ferrum college": "Division III",
  greensboro: "Division III",
  "greensboro college": "Division III",
  guilford: "Division III",
  "guilford college": "Division III",
  methodist: "Division III",
  "methodist university": "Division III",
  "nc wesleyan": "Division III",
  "north carolina wesleyan": "Division III",
  averett: "Division III",
  "averett university": "Division III",
  "washington and lee": "Division III",
  "washington & lee": "Division III",
  "hampden-sydney": "Division III",
  "hampden sydney": "Division III",
  "randolph-macon": "Division III",
  bridgewater: "Division III",
  "bridgewater college": "Division III",
  shenandoah: "Division III",
  "shenandoah university": "Division III",
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Get all athletes
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, division, college")
      .order("id")

    if (fetchError) {
      console.error("Error fetching athletes:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const updates: { id: string; oldDivision: string | null; newDivision: string }[] = []
    const errors: { id: string; error: string }[] = []

    // Process each athlete
    for (const athlete of athletes || []) {
      try {
        // Get standardized division
        let standardizedDivision = standardizeDivision(athlete.division)

        // If still null and we have a college, try to determine from college
        if (!standardizedDivision && athlete.college) {
          const collegeLower = athlete.college.toLowerCase().trim()
          for (const [key, value] of Object.entries(knownCollegeDivisions)) {
            if (collegeLower.includes(key)) {
              standardizedDivision = value
              break
            }
          }
        }

        // Only update if division changed
        if (standardizedDivision && standardizedDivision !== athlete.division) {
          const { error: updateError } = await supabase
            .from("athletes")
            .update({ division: standardizedDivision })
            .eq("id", athlete.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          updates.push({
            id: athlete.id,
            oldDivision: athlete.division,
            newDivision: standardizedDivision,
          })
        }
      } catch (err) {
        console.error(`Error updating athlete ${athlete.id}:`, err)
        errors.push({
          id: athlete.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Standardized divisions for ${updates.length} athletes with ${errors.length} errors.`,
      updates,
      errors,
    })
  } catch (error) {
    console.error("Error in standardize-divisions API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
