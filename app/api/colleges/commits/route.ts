import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchCollegeCommits } from "@/lib/college-commit-query"

const supabase = createAdminClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"
    const division = searchParams.get("division") || "all"
    const search = searchParams.get("search") || undefined

    // Pipe-separated raw college spellings from a leaderboard bucket
    const collegeNamesParam = searchParams.get("collegeNames")
    const collegeNames = collegeNamesParam
      ? collegeNamesParam.split("|").map((s) => s.trim()).filter(Boolean)
      : undefined

    const athletes = await fetchCollegeCommits(supabase, {
      gender,
      year,
      division,
      search,
      collegeNames,
    })

    return NextResponse.json({
      athletes,
      total: athletes.length,
    })
  } catch (error) {
    console.error("[RecruitNC] College commits API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch college commits",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
