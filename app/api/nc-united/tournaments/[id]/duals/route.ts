import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

interface Params {
  params: { id: string }
}

// GET /api/nc-united/tournaments/[id]/duals
// Returns all dual meet results for a tournament
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = createAdminClient()
    const tournamentId = params.id

    const { data, error } = await supabase
      .from("nc_united_dual_results")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("match_number", { ascending: true })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      tournament_id: tournamentId,
      duals: data || [],
      count: data?.length || 0,
    })
  } catch (err: any) {
    console.error("[NC United] Error fetching dual results:", err)
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch dual results" },
      { status: 500 }
    )
  }
}
