import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/nc-united/wrestlers
// GET /api/nc-united/wrestlers?tournament_id=xxx
// GET /api/nc-united/wrestlers?name=John
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get("tournament_id")
    const name = searchParams.get("name")

    let query = supabase
      .from("nc_united_wrestlers")
      .select("*")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })

    if (tournamentId) {
      // Filter to wrestlers who participated in this tournament
      const { data: tournamentResults, error: trError } = await supabase
        .from("nc_united_tournament_results")
        .select("wrestler_id")
        .eq("tournament_id", tournamentId)

      if (trError) throw trError

      const wrestlerIds = (tournamentResults || []).map((tr) => tr.wrestler_id)
      if (wrestlerIds.length > 0) {
        query = query.in("id", wrestlerIds)
      } else {
        // No wrestlers found for this tournament
        return NextResponse.json({
          ok: true,
          wrestlers: [],
          count: 0,
        })
      }
    }

    if (name) {
      query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      ok: true,
      wrestlers: data || [],
      count: data?.length || 0,
    })
  } catch (err: any) {
    console.error("[NC United] Error fetching wrestlers:", err)
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch wrestlers" },
      { status: 500 }
    )
  }
}
