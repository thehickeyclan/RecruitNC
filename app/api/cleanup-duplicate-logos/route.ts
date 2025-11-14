import { NextResponse } from "next/server"
import { list, del } from "@vercel/blob"

export async function GET() {
  try {
    const { blobs } = await list()

    // Group blobs by similar names/content
    const duplicateGroups: { [key: string]: any[] } = {}

    blobs.forEach((blob) => {
      // Create a key based on filename pattern and size
      const namePattern = blob.pathname
        .replace(/\/[a-z0-9]+-\d+\./, "/TIMESTAMP.") // Remove timestamp
        .replace(/\d+/g, "NUM") // Replace numbers

      const key = `${namePattern}_${blob.size}`

      if (!duplicateGroups[key]) {
        duplicateGroups[key] = []
      }
      duplicateGroups[key].push(blob)
    })

    // Find actual duplicates (groups with more than 1 item)
    const duplicates = Object.entries(duplicateGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([pattern, group]) => ({
        pattern,
        count: group.length,
        blobs: group.map((blob) => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
      }))

    return NextResponse.json({
      success: true,
      totalBlobs: blobs.length,
      duplicateGroups: duplicates,
      appStateLogos: blobs
        .filter(
          (blob) =>
            blob.pathname.toLowerCase().includes("appalachian") ||
            blob.pathname.toLowerCase().includes("app") ||
            blob.pathname.toLowerCase().includes("state") ||
            blob.url.includes("b9jnnu11"),
        )
        .map((blob) => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
    })
  } catch (error) {
    console.error("Error checking duplicates:", error)
    return NextResponse.json({ error: "Failed to check duplicates" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { urlsToDelete } = await request.json()

    if (!Array.isArray(urlsToDelete)) {
      return NextResponse.json({ error: "Invalid URLs array" }, { status: 400 })
    }

    const deleteResults = []

    for (const url of urlsToDelete) {
      try {
        await del(url)
        deleteResults.push({ url, success: true })
      } catch (error) {
        deleteResults.push({ url, success: false, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deleteResults.filter((r) => r.success).length,
      failed: deleteResults.filter((r) => !r.success).length,
      results: deleteResults,
    })
  } catch (error) {
    console.error("Error deleting duplicates:", error)
    return NextResponse.json({ error: "Failed to delete duplicates" }, { status: 500 })
  }
}
