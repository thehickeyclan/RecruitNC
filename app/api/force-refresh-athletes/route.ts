import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // This is a simple touch operation that forces a refresh of the data
    // by updating the updated_at timestamp without changing any other data
    const { data, error, count } = await supabase
      .from("athletes")
      .update({
        updated_at: new Date().toISOString(),
      })
      .not("college", "is", null) // Correct syntax for "where college is not null"

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
    console.error("Error in force refresh:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
