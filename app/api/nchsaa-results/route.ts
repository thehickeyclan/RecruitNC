import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteName = searchParams.get("athleteName")
    const graduationYear = searchParams.get("graduationYear")

    if (!athleteName || !graduationYear) {
      return NextResponse.json({ error: "Athlete name and graduation year required" }, { status: 400 })
    }

    const supabase = await createClient()
    const gradYear = parseInt(graduationYear)

    if (isNaN(gradYear)) {
      return NextResponse.json({ error: "Invalid graduation year" }, { status: 400 })
    }

    const { data: results, error } = await supabase
      .from("wrestling_nchsaa_results")
      .select("*")
      .ilike("wrestler_name", `%${athleteName}%`)
      .gte("year", gradYear - 4)
      .lte("year", gradYear)
      .order("year", { ascending: false })

    if (error) {
      console.error("Error fetching NCHSAA results:", error)
      return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      results: results || [],
    })
  } catch (error) {
    console.error("NCHSAA results API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

