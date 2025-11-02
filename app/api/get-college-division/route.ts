import { NextResponse } from "next/server"
import { getDivisionFromMappings } from "@/lib/get-division-from-mappings"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const collegeName = url.searchParams.get("college")

    if (!collegeName) {
      return NextResponse.json({ error: "College name is required" }, { status: 400 })
    }

    const division = await getDivisionFromMappings(collegeName)

    return NextResponse.json({ college: collegeName, division })
  } catch (error) {
    console.error("Error getting college division:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
