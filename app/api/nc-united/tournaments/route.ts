import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/nc-united/tournaments
// GET /api/nc-united/tournaments?year=2025
// GET /api/nc-united/tournaments?name=NHSCA
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const name = searchParams.get("name")

    let query = supabase
      .from("nc_united_tournaments")
      .select("*")
      .order("year", { ascending: false })
      .order("name", { ascending: true })

    if (year) {
      const yearNum = parseInt(year, 10)
      if (!isNaN(yearNum)) {
        query = query.eq("year", yearNum)
      }
    }

    if (name) {
      query = query.ilike("name", `%${name}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      ok: true,
      tournaments: data || [],
      count: data?.length || 0,
    })
  } catch (err: any) {
    console.error("[NC United] Error fetching tournaments:", err)
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch tournaments" },
      { status: 500 }
    )
  }
}
