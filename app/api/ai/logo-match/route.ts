import { type NextRequest, NextResponse } from "next/server"
import { LogoMatchingService } from "@/lib/ai/logo-matching-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const result = await LogoMatchingService.findLogos(query)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Logo match error:", error)
    return NextResponse.json({ error: "Failed to match logos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const result = await LogoMatchingService.findLogos(query)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Logo match error:", error)
    return NextResponse.json({ error: "Failed to match logos" }, { status: 500 })
  }
}
