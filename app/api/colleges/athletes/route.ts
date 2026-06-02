import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchCollegeCommits } from "@/lib/college-commit-query"

const supabase = createAdminClient()

/** Expand one college bucket — pass all spellings from leaderboard `college_names`. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const college = searchParams.get("college")?.trim()
    const gender = searchParams.get("gender") || "all"
    const year = searchParams.get("year") || "all"
    const division = searchParams.get("division") || "all"

    if (!college) {
      return NextResponse.json({ error: "College parameter is required" }, { status: 400 })
    }

    const collegeNamesParam = searchParams.get("collegeNames")
    const collegeNames = collegeNamesParam
      ? collegeNamesParam.split("|").map((s) => decodeURIComponent(s.trim())).filter(Boolean)
      : undefined

    const groupKey = searchParams.get("groupKey")?.trim() || undefined

    const athletes = await fetchCollegeCommits(supabase, {
      gender,
      year,
      division,
      collegeNames,
      groupKey,
    })

    return NextResponse.json({
      athletes,
      total: athletes.length,
    })
  } catch (error) {
    console.error("[RecruitNC] College athletes API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch college athletes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
