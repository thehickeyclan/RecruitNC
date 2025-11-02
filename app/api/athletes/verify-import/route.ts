import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request. Expected an array of athlete IDs.",
        },
        { status: 400 },
      )
    }

    // Query the database to verify the athletes exist
    const { data, error } = await supabase.from("athletes").select("id, name").in("id", ids)

    if (error) {
      console.error("Error verifying athletes:", error)
      return NextResponse.json(
        {
          error: "Failed to verify athletes in the database.",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Check if all IDs were found
    const foundIds = data.map((athlete) => athlete.id)
    const missingIds = ids.filter((id) => !foundIds.includes(id))

    return NextResponse.json({
      success: true,
      verified: data.length,
      total: ids.length,
      missing: missingIds.length,
      missingIds: missingIds,
      athletes: data.map((a) => ({ id: a.id, name: a.name })),
    })
  } catch (error: any) {
    console.error("Error in verify import API:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred.",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
