import { type NextRequest, NextResponse } from "next/server"
import { getProspectRankingById } from "@/services/rankings-service"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ranking = await getProspectRankingById(params.id)

    if (!ranking) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 })
    }

    return NextResponse.json(ranking)
  } catch (error) {
    console.error("Error in ranking API:", error)
    return NextResponse.json({ error: "Failed to fetch ranking" }, { status: 500 })
  }
}
