import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

interface Params {
  params: { id: string }
}

// GET /api/nc-united/tournaments/[id]/results
// Returns all wrestler results for a tournament, including their matches
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = createAdminClient()
    const tournamentId = params.id

    // Fetch tournament results with wrestler info
    const { data: results, error: resultsError } = await supabase
      .from("nc_united_tournament_results")
      .select(
        `
        *,
        wrestler:nc_united_wrestlers (
          id,
          first_name,
          last_name,
          weight,
          high_school
        )
      `
      )
      .eq("tournament_id", tournamentId)
      .order("weight", { ascending: true })

    console.log(`[NC United API] Tournament ${tournamentId} results query:`, {
      count: results?.length || 0,
      error: resultsError,
      results: results?.map((r: any) => ({
        id: r.id,
        wrestler_id: r.wrestler_id,
        weight: r.weight,
        record: r.record,
        hasWrestler: !!r.wrestler,
        wrestlerName: r.wrestler ? `${r.wrestler.first_name} ${r.wrestler.last_name}` : "MISSING WRESTLER"
      }))
    })

    if (resultsError) {
      console.error(`[NC United API] Error fetching results for tournament ${tournamentId}:`, resultsError)
      throw resultsError
    }

    // Fetch matches for each result
    const resultsWithMatches = await Promise.all(
      (results || []).map(async (result) => {
        const { data: matches, error: matchesError } = await supabase
          .from("nc_united_matches")
          .select("*")
          .eq("tournament_result_id", result.id)
          .order("match_number", { ascending: true })

        if (matchesError) {
          console.error(`[NC United] Error fetching matches for result ${result.id}:`, matchesError)
          return { ...result, matches: [] }
        }

        return {
          ...result,
          matches: matches || [],
        }
      })
    )

    return NextResponse.json({
      ok: true,
      tournament_id: tournamentId,
      results: resultsWithMatches,
      count: resultsWithMatches.length,
    })
  } catch (err: any) {
    console.error("[NC United] Error fetching tournament results:", err)
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch tournament results" },
      { status: 500 }
    )
  }
}
