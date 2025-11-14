import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get total number of colleges with commits
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("college")
      .not("college", "is", null)

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: athletesError.message }, { status: 500 })
    }

    // Count unique colleges
    const colleges = new Set()
    athletes.forEach((athlete) => {
      if (athlete.college) {
        colleges.add(athlete.college)
      }
    })

    // Count total commitments
    const totalCommits = athletes.length

    // Find top college
    const collegeCount = {}
    athletes.forEach((athlete) => {
      if (athlete.college) {
        collegeCount[athlete.college] = (collegeCount[athlete.college] || 0) + 1
      }
    })

    let topCollege = { name: "Unknown", count: 0 }
    Object.entries(collegeCount).forEach(([name, count]) => {
      if (count > topCollege.count) {
        topCollege = { name, count: count as number }
      }
    })

    return NextResponse.json({
      totalColleges: colleges.size,
      totalCommits,
      topCollege,
      growthRate: 12.5, // Placeholder
    })
  } catch (error) {
    console.error("Error in colleges-stats route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
