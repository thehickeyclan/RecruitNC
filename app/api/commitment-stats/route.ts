import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchCommitmentStats, type CommitmentAthleteFilters } from "@/lib/athletes-commitments-fetch"

export const revalidate = 120

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters: CommitmentAthleteFilters = {
      year: searchParams.get("year"),
      gender: searchParams.get("gender"),
      division: searchParams.get("division"),
    }

    const supabase = await createClient()
    const stats = await fetchCommitmentStats(supabase, filters)

    return NextResponse.json(
      {
        success: true,
        stats: {
          totalCommitments: stats.total,
          byGender: { male: stats.male, female: stats.female },
          byDivision: stats.divisions,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    )
  } catch (e) {
    console.error("[commitment-stats]", e)
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Failed to compute stats",
        stats: null,
      },
      { status: 500 },
    )
  }
}
