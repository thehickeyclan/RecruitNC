import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Use admin client to bypass RLS for public profile access
    const { data: athlete, error } = await adminSupabase
      .from("athletes")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    return NextResponse.json(athlete)
  } catch (error) {
    console.error("Error fetching athlete:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    )
  }
}
