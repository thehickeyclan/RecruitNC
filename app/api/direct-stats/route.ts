import { NextResponse } from "next/server"
import { getDirectStats } from "@/services/direct-stats-service"

export async function GET() {
  try {
    const stats = await getDirectStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error in direct stats API:", error)
    return NextResponse.json(
      {
        totalCommitments: 0,
        classOf2025: 0,
        classOf2026: 0,
        divisionBreakdown: {
          D1: 0,
          D2: 0,
          D3: 0,
          NAIA: 0,
          NJCAA: 0, // Changed from JuCo to NJCAA
        },
      },
      { status: 500 },
    )
  }
}
