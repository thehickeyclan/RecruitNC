import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteName = searchParams.get("athleteName")

    if (!athleteName) {
      return NextResponse.json({ success: false, error: "Athlete name is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch NCHSAA results directly from database
    const { data: nchsaaResults, error: nchsaaError } = await supabase
      .from("wrestling_nchsaa_results")
      .select("*")
      .ilike("wrestler_name", `%${athleteName}%`)
      .order("year", { ascending: false })

    if (nchsaaError) {
      console.error("[v0] Error fetching NCHSAA results:", nchsaaError)
    }

    return NextResponse.json({
      success: true,
      nchsaaResults: nchsaaResults || [],
    })
  } catch (error) {
    console.error("[v0] Tournament results API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tournament results" }, { status: 500 })
  }
}
