import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, graduationyear")
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch athletes",
          details: error,
        },
        { status: 500 },
      )
    }

    // Map to expected format
    const formattedAthletes = athletes.map((athlete) => ({
      id: athlete.id.toString(),
      name: athlete.name,
      graduationyear: athlete.graduationyear,
    }))

    return NextResponse.json({
      success: true,
      athletes: formattedAthletes,
    })
  } catch (error) {
    console.error("Error fetching athletes:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
