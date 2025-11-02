import { type NextRequest, NextResponse } from "next/server"
import { MissingLogoDetector } from "@/lib/ai/missing-logo-detector"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get("refresh") === "true"

    const result = await MissingLogoDetector.findMissingLogos(refresh)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Missing logos error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to find missing logos" },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    const result = await MissingLogoDetector.findMissingLogos(true)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Missing logos error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to find missing logos" },
      { status: 500 },
    )
  }
}
