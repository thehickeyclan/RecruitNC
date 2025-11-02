import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { searchTerm, division } = await request.json()

    if (!searchTerm || !division) {
      return NextResponse.json({ error: "Search term and division are required" }, { status: 400 })
    }

    const supabase = createClient()

    // First get the athletes that will be updated (for reporting)
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .ilike("college", `%${searchTerm}%`)

    if (fetchError) {
      console.error("Error fetching athletes:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Now update the athletes
    const { data, error, count } = await supabase
      .from("athletes")
      .update({
        division: division,
        updated_at: new Date().toISOString(),
      })
      .ilike("college", `%${searchTerm}%`)

    if (error) {
      console.error("Error updating athletes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map the athletes to include previous division
    const mappedAthletes = athletes?.map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
      college: athlete.college,
      previous_division: athlete.division,
    }))

    return NextResponse.json({
      success: true,
      count: count || 0,
      athletes: mappedAthletes || [],
      message: `Updated ${count || 0} athlete records with division "${division}".`,
    })
  } catch (error) {
    console.error("Error in manual division update:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
