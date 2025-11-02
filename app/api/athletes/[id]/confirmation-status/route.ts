import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Missing athlete ID" }, { status: 400 })
    }

    const supabase = createClient()

    // Check if athlete_confirmations table exists and query it
    const { data, error } = await supabase.from("athlete_confirmations").select("*").eq("athlete_id", id).maybeSingle()

    if (error) {
      console.error("Error fetching confirmation status:", error)
      // Return default unconfirmed status if table doesn't exist or other error
      return NextResponse.json({
        is_confirmed: false,
        confirmed_by: null,
        confirmed_at: null,
        confirmation_method: null,
      })
    }

    // Return confirmation status or default unconfirmed
    return NextResponse.json({
      is_confirmed: data?.is_confirmed || false,
      confirmed_by: data?.confirmed_by || null,
      confirmed_at: data?.confirmed_at || null,
      confirmation_method: data?.confirmation_method || null,
    })
  } catch (error) {
    console.error("Error in confirmation status endpoint:", error)
    return NextResponse.json(
      {
        is_confirmed: false,
        confirmed_by: null,
        confirmed_at: null,
        confirmation_method: null,
      },
      { status: 200 },
    )
  }
}
