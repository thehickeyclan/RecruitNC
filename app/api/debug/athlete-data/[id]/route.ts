import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get the raw athlete data from the database
    const { data: rawData, error: rawError } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (rawError) {
      console.error(`Error fetching raw athlete data for ID ${id}:`, rawError)
      return NextResponse.json({ error: rawError.message }, { status: 500 })
    }

    if (!rawData) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Return the raw data for debugging
    return NextResponse.json({
      success: true,
      rawData,
      dataTypes: {
        id: typeof rawData.id,
        name: typeof rawData.name,
        firstName: typeof rawData.firstName,
        lastName: typeof rawData.lastName,
        highschool: typeof rawData.highschool,
        college: typeof rawData.college,
        division: typeof rawData.division,
        weightclass: typeof rawData.weightclass,
        graduationyear: typeof rawData.graduationyear,
        commitmentdate: typeof rawData.commitmentdate,
        photourl: typeof rawData.photourl,
        achievements: typeof rawData.achievements,
        wrestlingClub: typeof rawData.wrestlingClub,
      },
      nullCheck: {
        id: rawData.id === null,
        name: rawData.name === null,
        firstName: rawData.firstName === null,
        lastName: rawData.lastName === null,
        highschool: rawData.highschool === null,
        college: rawData.college === null,
        division: rawData.division === null,
        weightclass: rawData.weightclass === null,
        graduationyear: rawData.graduationyear === null,
        commitmentdate: rawData.commitmentdate === null,
        photourl: rawData.photourl === null,
        achievements: rawData.achievements === null,
        wrestlingClub: rawData.wrestlingClub === null,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/debug/athlete-data/[id]:", error)
    return NextResponse.json({ error: "Failed to fetch athlete data" }, { status: 500 })
  }
}
