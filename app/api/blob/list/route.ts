import { type NextRequest, NextResponse } from "next/server"
import { list } from "@vercel/blob"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get("prefix")
    const limit = Number.parseInt(searchParams.get("limit") || "1000")

    console.log("Listing blobs with prefix:", prefix, "limit:", limit)

    const listResult = await list({
      prefix: prefix || undefined,
      limit,
    })

    console.log("Blob list result:", {
      count: listResult.blobs.length,
      hasMore: listResult.hasMore,
      cursor: listResult.cursor,
    })

    return NextResponse.json({
      success: true,
      blobs: listResult.blobs,
      hasMore: listResult.hasMore,
      cursor: listResult.cursor,
      total: listResult.blobs.length,
    })
  } catch (error) {
    console.error("Error listing blobs:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list blobs",
        blobs: [],
      },
      { status: 500 },
    )
  }
}
