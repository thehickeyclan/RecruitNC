import { type NextRequest, NextResponse } from "next/server"
import { getProspectRankings } from "@/services/rankings-service"
import {
  getPublicRankingsMax,
  isPublicRankingsYearPublished,
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
} from "@/lib/public-rankings-cap"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const year = searchParams.get("year")
  const weightClass = searchParams.get("weightClass")
  const region = searchParams.get("region")
  const verified = searchParams.get("verified")

  const requestedYear = year ? Number.parseInt(year, 10) : null
  if (requestedYear != null && !isPublicRankingsYearPublished(requestedYear)) {
    return NextResponse.json(
      {
        error: `Class of ${requestedYear} rankings are not public yet.`,
        available_years: PUBLISHED_PUBLIC_RANKINGS_YEARS,
      },
      { status: 404 },
    )
  }

  const filters = {
    ...(requestedYear ? { graduationYear: requestedYear } : {}),
    ...(weightClass ? { weightClass } : {}),
    ...(region ? { region } : {}),
    ...(verified ? { verified: verified === "true" } : {}),
  }

  try {
    const rankings = await getProspectRankings(filters)
    const publicRankings = rankings.filter((ranking) => {
      const rankingYear = Number(ranking.graduation_year)
      if (!isPublicRankingsYearPublished(rankingYear)) return false
      const maxRank = getPublicRankingsMax(rankingYear)
      return Number(ranking.overall_rank) >= 1 && Number(ranking.overall_rank) <= maxRank
    })
    return NextResponse.json(publicRankings)
  } catch (error) {
    console.error("Error in rankings API:", error)
    return NextResponse.json({ error: "Failed to fetch rankings" }, { status: 500 })
  }
}
