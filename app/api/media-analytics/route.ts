import { NextResponse } from "next/server"
import { list } from "@vercel/blob"

export async function GET() {
  try {
    console.log("=== MEDIA ANALYTICS API CALLED ===")

    // Get all blobs from Vercel Blob storage
    const { blobs } = await list()
    console.log(`Found ${blobs.length} total blobs`)

    // Initialize analytics
    const analytics = {
      totalFiles: 0,
      totalSize: 0,
      categories: {} as Record<string, { count: number; size: number }>,
      duplicates: [] as Array<{
        filename: string
        urls: string[]
        count: number
      }>,
    }

    // Track filenames for duplicate detection
    const filenameMap = new Map<string, string[]>()

    // Process each blob
    for (const blob of blobs) {
      analytics.totalFiles++
      analytics.totalSize += blob.size

      // Extract category from pathname (first part of path)
      const pathParts = blob.pathname.split("/")
      const category = pathParts.length > 1 ? pathParts[0] : "uncategorized"

      // Initialize category if not exists
      if (!analytics.categories[category]) {
        analytics.categories[category] = { count: 0, size: 0 }
      }

      analytics.categories[category].count++
      analytics.categories[category].size += blob.size

      // Track for duplicates (based on filename without path)
      const filename = pathParts[pathParts.length - 1]
      if (!filenameMap.has(filename)) {
        filenameMap.set(filename, [])
      }
      filenameMap.get(filename)!.push(blob.url)
    }

    // Find duplicates
    for (const [filename, urls] of filenameMap.entries()) {
      if (urls.length > 1) {
        analytics.duplicates.push({
          filename,
          urls,
          count: urls.length,
        })
      }
    }

    console.log("Analytics generated:", {
      totalFiles: analytics.totalFiles,
      totalSize: analytics.totalSize,
      categoriesCount: Object.keys(analytics.categories).length,
      duplicatesCount: analytics.duplicates.length,
    })

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
