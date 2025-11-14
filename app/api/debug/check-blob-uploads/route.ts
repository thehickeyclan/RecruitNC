import { NextResponse } from "next/server"
import { list } from "@vercel/blob"

export async function GET() {
  try {
    // List all blobs in the division-logos prefix
    const blobs = await list({ prefix: "division-logos/" })

    return NextResponse.json({
      success: true,
      blobs: blobs.blobs,
    })
  } catch (error) {
    console.error("Error listing blobs:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
