import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchProspectDirectoryPage } from "@/lib/prospects-directory"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const graduationYear = searchParams.get("graduationYear")
    const gender = searchParams.get("gender")
    const minYearParam = searchParams.get("minYear")
    const maxYearParam = searchParams.get("maxYear")
    const rawLimit = Number.parseInt(searchParams.get("limit") || "500", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 500

    const minYear = minYearParam ? Number.parseInt(minYearParam, 10) : null
    const maxYear = maxYearParam ? Number.parseInt(maxYearParam, 10) : null

    const { prospects, hasMore } = await fetchProspectDirectoryPage(supabase, {
      graduationYear,
      gender,
      minYear: Number.isFinite(minYear!) ? minYear : null,
      maxYear: Number.isFinite(maxYear!) ? maxYear : null,
      limit,
      offset,
    })

    return NextResponse.json(
      {
        prospects,
        pagination: {
          limit,
          offset,
          hasMore,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[prospects API]", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
