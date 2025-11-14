import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    console.log("🤼 Clubs API: Starting fetch")
    const supabase = createClient()

    // Fetch all athletes from the database
    const { data: athletes, error } = await supabase.from("athletes").select("*")

    if (error) {
      console.error("❌ Clubs API: Error fetching athletes:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        clubs: [],
      })
    }

    if (!athletes) {
      return NextResponse.json({
        success: true,
        clubs: [],
      })
    }

    console.log(`🤼 Clubs API: Processing ${athletes.length} athlete records`)

    // Extract unique wrestling clubs
    const clubsMap = new Map()

    athletes.forEach((athlete) => {
      // Check various possible field names for wrestling club
      const clubName =
        athlete.wrestlingClub ||
        athlete.wrestling_club ||
        athlete.club ||
        athlete.team_affiliation ||
        athlete.team ||
        ""

      if (!clubName || clubName.trim() === "") return

      // Normalize club name
      const normalizedName = clubName.trim()

      // Determine gender (default to "Men" if not specified)
      const gender = athlete.gender?.toLowerCase() === "female" ? "Women" : "Men"

      if (!clubsMap.has(normalizedName)) {
        clubsMap.set(normalizedName, {
          name: normalizedName,
          location: athlete.location || "North Carolina",
          athletes: 0,
          commits: 0,
          menCount: 0,
          womenCount: 0,
          divisions: {
            D1: 0,
            D2: 0,
            D3: 0,
            NAIA: 0,
            JuCo: 0,
          },
        })
      }

      const clubData = clubsMap.get(normalizedName)
      clubData.athletes++

      // Update gender counts
      if (gender === "Men") {
        clubData.menCount += 1
      } else {
        clubData.womenCount += 1
      }

      // Count college commits and divisions
      if (athlete.college && athlete.college.trim() !== "") {
        clubData.commits++

        // Determine division
        const division = athlete.division || ""
        if (division.match(/d1|division 1|division i/i)) {
          clubData.divisions.D1++
        } else if (division.match(/d2|division 2|division ii/i)) {
          clubData.divisions.D2++
        } else if (division.match(/d3|division 3|division iii/i)) {
          clubData.divisions.D3++
        } else if (division.match(/naia/i)) {
          clubData.divisions.NAIA++
        } else if (division.match(/juco|junior college|njcaa/i)) {
          clubData.divisions.JuCo++
        }
      }
    })

    // Convert map to array
    const clubsArray = Array.from(clubsMap.values())

    console.log(`✅ Clubs API: Successfully processed ${clubsArray.length} clubs`)

    return NextResponse.json({
      success: true,
      clubs: clubsArray,
    })
  } catch (error) {
    console.error("💥 Clubs API: Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch clubs",
      clubs: [],
    })
  }
}
