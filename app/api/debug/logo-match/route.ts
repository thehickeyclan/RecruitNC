import { NextResponse } from "next/server"
import { list } from "@vercel/blob"
import { findLogoForEntity } from "@/lib/image-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const name = searchParams.get("name")

    if (!category || !name) {
      return NextResponse.json({ error: "Category and name parameters are required" }, { status: 400 })
    }

    if (!["athlete", "highschool", "college", "club"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    // List all images in the category
    const blobs = await list({ prefix: `${category}/` })

    // Get all filenames for debugging
    const filenames = blobs.blobs.map((blob) => {
      const pathname = blob.pathname
      const filename = pathname.split("/").pop() || ""
      return {
        url: blob.url,
        filename,
        pathname,
      }
    })

    // Find the matching logo
    const logoUrl = findLogoForEntity(name, blobs.blobs)

    // Return detailed debugging info
    return NextResponse.json({
      query: {
        category,
        name,
        normalizedName: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      },
      result: {
        found: !!logoUrl,
        url: logoUrl,
      },
      availableImages: filenames,
    })
  } catch (error) {
    console.error("Error in logo match debugging:", error)
    return NextResponse.json({ error: "Failed to debug logo matching" }, { status: 500 })
  }
}
