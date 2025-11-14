import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get unique high schools from athletes table
    const { data: athleteHighSchools, error: athletesError } = await supabase
      .from("athletes")
      .select("highschool")
      .not("highschool", "is", null)
      .not("highschool", "eq", "")

    if (athletesError) {
      console.error("Error fetching high schools from athletes:", athletesError)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch high schools from athletes",
        details: athletesError.message,
      })
    }

    // Extract unique high school names
    const uniqueHighSchools = Array.from(
      new Set(athleteHighSchools?.map((athlete) => athlete.highschool).filter(Boolean) || []),
    ).sort()

    // Create high school objects with IDs
    const highSchools = uniqueHighSchools.map((name, index) => ({
      id: (index + 1).toString(),
      name: name,
    }))

    // Add some common NC high schools that might not be in the athletes table yet
    const commonNCHighSchools = [
      "Cardinal Gibbons",
      "Cary High School",
      "Hough High School",
      "Laney High School",
      "Jack Britt High School",
      "Green Hope High School",
      "Apex High School",
      "Wake Forest High School",
      "Millbrook High School",
      "Sanderson High School",
    ]

    // Add common schools that aren't already in the list
    commonNCHighSchools.forEach((commonSchool) => {
      if (!highSchools.find((hs) => hs.name.toLowerCase() === commonSchool.toLowerCase())) {
        highSchools.push({
          id: (highSchools.length + 1).toString(),
          name: commonSchool,
        })
      }
    })

    return NextResponse.json({
      success: true,
      highSchools: highSchools,
      count: highSchools.length,
    })
  } catch (error) {
    console.error("Error in high-schools-list API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch high schools",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
