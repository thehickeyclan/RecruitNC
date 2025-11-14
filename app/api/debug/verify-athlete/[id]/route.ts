import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get the raw database record
    const { data: dbData, error: dbError } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (dbError) {
      console.error(`Error fetching athlete with ID ${id}:`, dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!dbData) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Return the raw database record for debugging
    return NextResponse.json({
      success: true,
      dbRecord: dbData,
    })
  } catch (error) {
    console.error("Error in GET /api/debug/verify-athlete/[id]:", error)
    return NextResponse.json({ error: "Failed to verify athlete" }, { status: 500 })
  }
}
