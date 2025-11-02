import { NextResponse } from "next/server"
import { list } from "@vercel/blob"

export async function GET() {
  try {
    // List all blobs to see what's already uploaded
    const { blobs } = await list()

    // Filter for logo files
    const logoBlobs = blobs.filter(
      (blob) =>
        blob.pathname.includes("logo") ||
        blob.pathname.includes("appalachian") ||
        blob.pathname.includes("state") ||
        blob.pathname.includes("college"),
    )

    // Group by likely entity
    const organizedLogos = logoBlobs.map((blob) => ({
      url: blob.url,
      filename: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      downloadUrl: blob.downloadUrl,
    }))

    return NextResponse.json({
      success: true,
      totalBlobs: blobs.length,
      logoBlobs: organizedLogos,
      allBlobs: blobs.map((b) => ({ url: b.url, filename: b.pathname, size: b.size })),
    })
  } catch (error) {
    console.error("Error checking existing logos:", error)
    return NextResponse.json({ error: "Failed to check existing logos" }, { status: 500 })
  }
}
