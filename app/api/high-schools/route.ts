import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { mockHighSchools } from "@/lib/mock-data"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Helper function to determine division category
function getDivisionCategory(division: string | null): string {
  if (!division) return "unknown"

  const divLower = division.toLowerCase()

  if (divLower.includes("d1") || divLower.includes("division 1") || divLower.includes("division i")) {
    return "d1"
  } else if (divLower.includes("d2") || divLower.includes("division 2") || divLower.includes("division ii")) {
    return "d2"
  } else if (divLower.includes("d3") || divLower.includes("division 3") || divLower.includes("division iii")) {
    return "d3"
  } else if (divLower.includes("naia")) {
    return "naia"
  } else if (divLower.includes("juco") || divLower.includes("junior college") || divLower.includes("njcaa")) {
    return "juco"
  }

  return "unknown"
}

export async function GET() {
  try {
    console.log("🏫 High Schools API: Starting fetch")
    const supabase = createClient()

    // Fetch all athletes with high school and college data
    const { data: athletesData, error } = await supabase
      .from("athletes")
      .select("highschool, college, division, gender")
      .not("highschool", "is", null)
      .not("college", "is", null)

    if (error) {
      console.error("❌ High Schools API: Error fetching athletes:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        highSchools: [],
      })
    }

    if (!athletesData) {
      return NextResponse.json({
        success: true,
        highSchools: [],
      })
    }

    console.log(`🏫 High Schools API: Processing ${athletesData.length} athlete records`)

    // Group athletes by high school
    const highSchoolMap = new Map()

    athletesData.forEach((athlete) => {
      if (!athlete.highschool || !athlete.college) return

      const highSchoolName = athlete.highschool
      const divisionCategory = getDivisionCategory(athlete.division)
      const gender = athlete.gender?.toLowerCase() === "female" ? "Women" : "Men"

      if (!highSchoolMap.has(highSchoolName)) {
        // Initialize new high school entry
        const mockData = mockHighSchools.find((school) => school.name.toLowerCase() === highSchoolName.toLowerCase())

        highSchoolMap.set(highSchoolName, {
          name: highSchoolName,
          location: mockData?.location || "North Carolina",
          conference: mockData?.conference || "Unknown Conference",
          totalCommits: 1,
          menCount: gender === "Men" ? 1 : 0,
          womenCount: gender === "Women" ? 1 : 0,
          divisionBreakdown: {
            d1: divisionCategory === "d1" ? 1 : 0,
            d2: divisionCategory === "d2" ? 1 : 0,
            d3: divisionCategory === "d3" ? 1 : 0,
            naia: divisionCategory === "naia" ? 1 : 0,
            juco: divisionCategory === "juco" ? 1 : 0,
          },
        })
      } else {
        // Update existing high school entry
        const highSchool = highSchoolMap.get(highSchoolName)
        highSchool.totalCommits += 1

        // Update gender counts
        if (gender === "Men") {
          highSchool.menCount += 1
        } else {
          highSchool.womenCount += 1
        }

        if (divisionCategory !== "unknown") {
          highSchool.divisionBreakdown[divisionCategory] += 1
        }
      }
    })

    // Convert map to array
    const highSchoolsArray = Array.from(highSchoolMap.values())

    console.log(`✅ High Schools API: Successfully processed ${highSchoolsArray.length} high schools`)

    return NextResponse.json({
      success: true,
      highSchools: highSchoolsArray,
    })
  } catch (error) {
    console.error("💥 High Schools API: Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch high schools",
      highSchools: [],
    })
  }
}
