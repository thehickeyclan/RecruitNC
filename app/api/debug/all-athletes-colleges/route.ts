import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    // Fetch all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division, graduationyear")
      .not("college", "is", null)
      .order("college")

    if (error) {
      console.error("Error fetching athletes:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    // Group athletes by college
    const collegeMap: Record<string, { division: string; athletes: any[] }> = {}

    athletes.forEach((athlete) => {
      const college = athlete.college?.trim() || "Unknown"

      if (!collegeMap[college]) {
        collegeMap[college] = {
          division: athlete.division || "",
          athletes: [],
        }
      }

      collegeMap[college].athletes.push(athlete)
    })

    return NextResponse.json({
      totalAthletes: athletes.length,
      colleges: collegeMap,
    })
  } catch (error) {
    console.error("Error in all-athletes-colleges:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
