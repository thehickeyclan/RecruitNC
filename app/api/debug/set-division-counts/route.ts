import { NextResponse } from "next/server"

// We'll store the counts in memory since this is just for display purposes
// In a real app, you might want to store this in a database
let divisionCounts = {
  D1: 16,
  D2: 20,
  D3: 18,
  NAIA: 8,
  NJCAA: 4,
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { counts } = body

    if (!counts) {
      return NextResponse.json({ error: "Counts are required" }, { status: 400 })
    }

    // Update the division counts
    divisionCounts = {
      D1: counts.D1 || 0,
      D2: counts.D2 || 0,
      D3: counts.D3 || 0,
      NAIA: counts.NAIA || 0,
      NJCAA: counts.NJCAA || 0,
    }

    return NextResponse.json({
      success: true,
      message: "Division counts updated successfully",
      counts: divisionCounts,
    })
  } catch (error) {
    console.error("Error in set-division-counts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    counts: divisionCounts,
  })
}
