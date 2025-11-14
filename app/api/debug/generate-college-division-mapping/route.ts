import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Fetch all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)
      .not("division", "is", null)

    if (error) {
      console.error("Error fetching athletes:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    // Create a mapping of college to division
    const collegeToDiv: Record<string, { division: string; count: number }> = {}

    athletes.forEach((athlete) => {
      if (!athlete.college || !athlete.division) return

      const college = athlete.college.trim().toLowerCase()

      if (!collegeToDiv[college]) {
        collegeToDiv[college] = {
          division: athlete.division,
          count: 1,
        }
      } else {
        // If this college already exists in our mapping, increment the count
        collegeToDiv[college].count++

        // If there's a conflict (different divisions for the same college),
        // keep the one with the higher count
        if (collegeToDiv[college].division !== athlete.division) {
          console.log(
            `Division conflict for ${athlete.college}: ${collegeToDiv[college].division} vs ${athlete.division}`,
          )
        }
      }
    })

    // Convert to a simple mapping for the API
    const mapping: Record<string, string> = {}
    Object.entries(collegeToDiv).forEach(([college, data]) => {
      mapping[college] = data.division
    })

    return NextResponse.json({
      totalColleges: Object.keys(mapping).length,
      mapping,
    })
  } catch (error) {
    console.error("Error generating college division mapping:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
