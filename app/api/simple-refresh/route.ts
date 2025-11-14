import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Add a WHERE clause that selects all records
    // This satisfies the database requirement while still updating all records
    const { error, count } = await supabase
      .from("athletes")
      .update({
        updated_at: new Date().toISOString(),
      })
      .filter("id", "not.is", null)

    if (error) {
      console.error("Error refreshing athletes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      message: `Refreshed ${count || 0} athlete records.`,
    })
  } catch (error) {
    console.error("Error in simple refresh:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
