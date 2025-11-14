import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { id, division } = await request.json()

    if (!id || !division) {
      return NextResponse.json({ error: "Missing required fields: id and division" }, { status: 400 })
    }

    // Validate division is one of the standard values
    const validDivisions = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]
    if (!validDivisions.includes(division)) {
      return NextResponse.json(
        {
          error: `Invalid division. Must be one of: ${validDivisions.join(", ")}`,
        },
        { status: 400 },
      )
    }

    const supabase = createClient()

    // Update the athlete's division
    const { data, error } = await supabase.from("athletes").update({ division }).eq("id", id).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated athlete ${id} division to ${division}`,
      data,
    })
  } catch (error) {
    console.error("Error in manual-standardize-division API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
