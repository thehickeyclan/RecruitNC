import { type NextRequest, NextResponse } from "next/server"
import { getProspectRankings } from "@/services/rankings-service"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const year = searchParams.get("year")
  const weightClass = searchParams.get("weightClass")
  const region = searchParams.get("region")
  const verified = searchParams.get("verified")

  const filters = {
    ...(year ? { graduationYear: Number.parseInt(year) } : {}),
    ...(weightClass ? { weightClass } : {}),
    ...(region ? { region } : {}),
    ...(verified ? { verified: verified === "true" } : {}),
  }

  try {
    const rankings = await getProspectRankings(filters)
    return NextResponse.json(rankings)
  } catch (error) {
    console.error("Error in rankings API:", error)
    return NextResponse.json({ error: "Failed to fetch rankings" }, { status: 500 })
  }
}
